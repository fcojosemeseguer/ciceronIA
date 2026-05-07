import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any
from urllib.parse import parse_qs

from fastapi import FastAPI, Request

LOG_DIR = Path("logs")
LOG_FILE = LOG_DIR / "requests.log"
REDACTED_VALUE = "***"
SENSITIVE_FIELD_MARKERS = (
    "password",
    "pswd",
    "pwd",
    "token",
    "jwt",
    "secret",
    "authorization",
)

_log_lock = Lock()


def register_request_logging_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        body = await request.body()
        _restore_request_body(request, body)

        started_at = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            _log_request(
                request=request,
                body=body,
                status_code=status_code,
                duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
            )


def _log_request(
    request: Request,
    body: bytes,
    status_code: int,
    duration_ms: float,
) -> None:
    try:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": request.method,
            "path": request.url.path,
            "query_params": _sanitize_payload(
                _normalize_multi_items(request.query_params.multi_items())
            ),
            "ip": _extract_client_ip(request),
            "payload": _sanitize_payload(
                _extract_payload_snapshot(
                    body=body,
                    content_type=request.headers.get("content-type", ""),
                )
            ),
            "status_code": status_code,
            "duration_ms": duration_ms,
        }
        _append_log_entry(entry)
    except Exception as exc:
        fallback_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": request.method,
            "path": request.url.path,
            "ip": _extract_client_ip(request),
            "status_code": status_code,
            "duration_ms": duration_ms,
            "logging_error": str(exc),
        }
        try:
            _append_log_entry(fallback_entry)
        except Exception:
            pass


def _restore_request_body(request: Request, body: bytes) -> None:
    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": body, "more_body": False}

    request._receive = receive  # type: ignore[attr-defined]


def _extract_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client:
        return request.client.host

    return None


def _extract_payload_snapshot(body: bytes, content_type: str) -> Any:
    if not body:
        return None

    normalized_content_type = content_type.lower()

    if "application/json" in normalized_content_type:
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return body.decode("utf-8", errors="replace")

    if "application/x-www-form-urlencoded" in normalized_content_type:
        decoded = body.decode("utf-8", errors="replace")
        return _normalize_multi_items(
            parse_qs(decoded, keep_blank_values=True).items(),
        )

    if "multipart/form-data" in normalized_content_type:
        return _parse_multipart_form_data(body, content_type)

    if (
        "text/" in normalized_content_type
        or "application/xml" in normalized_content_type
    ):
        return body.decode("utf-8", errors="replace")

    return {
        "body_bytes": len(body),
        "body_preview": body[:200].decode("utf-8", errors="replace"),
    }


def _parse_multipart_form_data(body: bytes, content_type: str) -> dict[str, Any]:
    boundary = _extract_boundary(content_type)
    if boundary is None:
        return {
            "body_bytes": len(body),
            "body_preview": body[:200].decode("utf-8", errors="replace"),
        }

    payload: dict[str, Any] = {}
    delimiter = f"--{boundary}".encode("utf-8")

    for raw_part in body.split(delimiter):
        part = raw_part.strip(b"\r\n")
        if not part or part == b"--":
            continue

        if part.endswith(b"--"):
            part = part[:-2]

        header_blob, separator, content = part.partition(b"\r\n\r\n")
        if not separator:
            continue

        headers = _parse_part_headers(header_blob)
        disposition = headers.get("content-disposition", "")
        field_name = _extract_disposition_value(disposition, "name")
        if field_name is None:
            continue

        file_name = _extract_disposition_value(disposition, "filename")
        content = content.rstrip(b"\r\n")

        if file_name is not None:
            value: Any = {
                "filename": file_name,
                "content_type": headers.get("content-type"),
                "size_bytes": len(content),
            }
        else:
            value = content.decode("utf-8", errors="replace")

        _append_field_value(payload, field_name, value)

    return payload


def _extract_boundary(content_type: str) -> str | None:
    match = re.search(r'boundary="?([^";]+)"?', content_type, flags=re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def _parse_part_headers(header_blob: bytes) -> dict[str, str]:
    headers: dict[str, str] = {}
    for raw_line in header_blob.split(b"\r\n"):
        if b":" not in raw_line:
            continue
        key, value = raw_line.split(b":", 1)
        headers[key.decode("utf-8", errors="replace").strip().lower()] = (
            value.decode("utf-8", errors="replace").strip()
        )
    return headers


def _extract_disposition_value(disposition: str, key: str) -> str | None:
    match = re.search(rf'{key}="([^"]*)"', disposition, flags=re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def _append_field_value(payload: dict[str, Any], key: str, value: Any) -> None:
    if key not in payload:
        payload[key] = value
        return

    existing = payload[key]
    if isinstance(existing, list):
        existing.append(value)
        return

    payload[key] = [existing, value]


def _normalize_multi_items(items: Any) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in items:
        if isinstance(value, list):
            normalized[key] = value[0] if len(value) == 1 else value
            continue
        _append_field_value(normalized, key, value)
    return normalized


def _sanitize_payload(value: Any, key: str | None = None) -> Any:
    if key is not None and _is_sensitive_key(key):
        return REDACTED_VALUE

    if isinstance(value, dict):
        return {
            nested_key: _sanitize_payload(nested_value, nested_key)
            for nested_key, nested_value in value.items()
        }

    if isinstance(value, list):
        return [_sanitize_payload(item, key) for item in value]

    return value


def _is_sensitive_key(key: str) -> bool:
    normalized_key = re.sub(r"[^a-z0-9]", "", key.lower())
    return any(marker in normalized_key for marker in SENSITIVE_FIELD_MARKERS)


def _append_log_entry(entry: dict[str, Any]) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(entry, ensure_ascii=False, default=str)

    with _log_lock:
        with LOG_FILE.open("a", encoding="utf-8") as log_file:
            log_file.write(serialized + "\n")
