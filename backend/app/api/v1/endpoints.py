from datetime import datetime, timedelta, timezone
from pathlib import Path
import hashlib
import json
import os
import secrets
import shutil
import time
import unicodedata
from uuid import uuid4

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.api.v1.models import (
    AnalyseData,
    AuthDataProject,
    AuthDataProjects,
    CredsInput,
    NewProjectInfo,
    QuickAnalyseData,
    ShareLinkCreateData,
)
from app.core.database import (
    build_project_dashboard_summary,
    check_user,
    create_analysis,
    create_project,
    create_project_segment,
    create_project_share_link,
    create_user,
    get_project,
    get_project_by_code,
    get_project_debate_type,
    get_project_for_user,
    get_project_segments,
    get_project_chat_human_messages,
    get_project_chat_ai_messages,
    get_project_share_link_by_token_hash,
    get_projects,
    get_projects_paginated,
    get_user_code,
    list_project_share_links,
    revoke_project_share_link,
    save_metrics,
    save_transcription,
)
from app.processors.pipeline import DebateFase, Postura, create_chat
from app.services.metrics import process_complete_analysis
from data.debate_types import get_debate_type, list_debate_types

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

DEPRECATION_SUNSET = "Wed, 30 Sep 2026 23:59:59 GMT"
DEFAULT_SHARE_LINK_DAYS = 30

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 60
_public_dashboard_rate_limit: dict[str, list[float]] = {}

UPLOAD_DIR = Path("uploads/audios")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

chats = {}

upct_phase_enum_by_id = {
    "introduccion": DebateFase.INTRO,
    "refutacion_1": DebateFase.REF1,
    "refutacion_2": DebateFase.REF2,
    "conclusion": DebateFase.CONCLUSION,
    "final": DebateFase.FINAL,
}

upct_postura_enum_by_value = {
    "A Favor": Postura.FAVOR,
    "En Contra": Postura.CONTRA,
}

KEY_METRICS_NAMES = [
    "F0semitoneFrom27.5Hz_sma3nz_stddevNorm",
    "loudness_sma3_amean",
    "loudness_sma3_stddevNorm",
    "loudnessPeaksPerSec",
    "VoicedSegmentsPerSec",
    "MeanUnvoicedSegmentLength",
    "jitterLocal_sma3nz_amean",
    "shimmerLocaldB_sma3nz_amean",
]


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = "".join(c for c in normalized if not unicodedata.combining(c))
    return " ".join(ascii_value.lower().strip().split())


def _extract_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="invalid authorization header")
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="missing bearer token")
    return token


def _decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="token expired") from exc
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="invalid token") from exc


def _resolve_auth_payload(request: Request, response: Response, legacy_jwt: str | None) -> dict:
    bearer_token = _extract_bearer_token(request)
    if bearer_token:
        return _decode_access_token(bearer_token)

    if legacy_jwt:
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = DEPRECATION_SUNSET
        return _decode_access_token(legacy_jwt)

    raise HTTPException(status_code=401, detail="missing authentication token")


def _resolve_project_ownership_or_fail(user_code: str, project_code: str) -> dict:
    owned_project = get_project_for_user(user_code, project_code)
    if owned_project:
        return owned_project

    any_project = get_project_by_code(project_code)
    if any_project:
        raise HTTPException(status_code=403, detail="forbidden project access")
    raise HTTPException(status_code=404, detail="project not found")


def _resolve_phase_config_or_422(debate_config, fase_input: str):
    fase_cfg = debate_config.get_fase_by_id(fase_input)
    if fase_cfg is not None:
        return fase_cfg

    fase_cfg = debate_config.get_fase_by_nombre(fase_input)
    if fase_cfg is not None:
        return fase_cfg

    normalized_input = _normalize_text(fase_input)
    for candidate in debate_config.fases:
        if normalized_input in {_normalize_text(candidate.id), _normalize_text(candidate.nombre)}:
            return candidate

    valid_options = [f.id for f in debate_config.fases] + [f.nombre for f in debate_config.fases]
    raise HTTPException(
        status_code=422,
        detail=f"invalid fase '{fase_input}'. valid values: {valid_options}",
    )


def _resolve_postura_or_422(debate_config, postura_input: str) -> str:
    valid_posturas = debate_config.get_posturas_validas()
    if postura_input in valid_posturas:
        return postura_input

    normalized_input = _normalize_text(postura_input)
    for postura in valid_posturas:
        if normalized_input == _normalize_text(postura):
            return postura

    raise HTTPException(
        status_code=422,
        detail=f"invalid postura '{postura_input}'. valid values: {valid_posturas}",
    )


def _build_metrics_summary(metrics: dict) -> dict:
    summary = {}
    for speaker, speaker_metrics in metrics.items():
        summary[speaker] = {
            metric_name: speaker_metrics.get(metric_name)
            for metric_name in KEY_METRICS_NAMES
            if metric_name in speaker_metrics
        }
    return summary


def _build_transcript_preview(transcription: list[dict], max_len: int = 280) -> str:
    full_text = " ".join(seg.get("text", "") for seg in transcription).strip()
    if len(full_text) <= max_len:
        return full_text
    return full_text[:max_len].rstrip() + "..."


def _prepare_segments_for_response(
    segments: list[dict],
    include_transcript: bool,
    include_metrics: bool,
) -> list[dict]:
    prepared = []
    for segment in segments:
        item = {
            "segment_id": segment.get("segment_id"),
            "project_code": segment.get("project_code"),
            "debate_type": segment.get("debate_type"),
            "fase_id": segment.get("fase_id"),
            "fase_nombre": segment.get("fase_nombre"),
            "postura": segment.get("postura"),
            "orador": segment.get("orador"),
            "num_speakers": segment.get("num_speakers"),
            "duration_seconds": segment.get("duration_seconds"),
            "analysis": segment.get("analysis", {}),
            "metrics_summary": segment.get("metrics_summary", {}),
            "created_at": segment.get("created_at"),
        }

        transcript_full = segment.get("transcript", [])
        transcript_preview = segment.get("transcript_preview", "")

        # Si hay transcripción completa, exponerla siempre para evitar perder contenido
        # en flujos legacy donde solo se mostraba transcript_preview.
        if transcript_full:
            item["transcript"] = transcript_full
        elif include_transcript:
            item["transcript"] = []

        item["transcript_preview"] = transcript_preview

        if include_metrics:
            item["metrics_raw"] = segment.get("metrics_raw", {})

        prepared.append(item)

    return prepared


def _to_fase_id(value: str) -> str:
    return _normalize_text(value).replace(" ", "_")


def _build_legacy_segments(
    project: dict,
    fase: str | None,
    postura: str | None,
    orador: str | None,
) -> list[dict]:
    legacy_items = get_project(
        {"user_code": project.get("user_code"), "project_code": project["code"]}
    ) or []
    legacy_prompts = get_project_chat_human_messages(project["code"])
    legacy_ai_messages = get_project_chat_ai_messages(project["code"])

    def _extract_between(text: str, start: str, end: str) -> str:
        start_idx = text.find(start)
        if start_idx == -1:
            return ""
        start_idx += len(start)
        end_idx = text.find(end, start_idx)
        if end_idx == -1:
            end_idx = len(text)
        return text[start_idx:end_idx].strip()

    def _parse_legacy_prompt(prompt: str) -> tuple[list[dict], dict]:
        transcript_raw = _extract_between(
            prompt,
            "TRANSCRIPCIÓN:",
            "MÉTRICAS PARALINGÜÍSTICAS:",
        )
        metrics_raw = _extract_between(
            prompt,
            "MÉTRICAS PARALINGÜÍSTICAS:",
            "FORMATO DE RESPUESTA REQUERIDO:",
        )

        transcript_items: list[dict] = []
        for line in transcript_raw.splitlines():
            line = line.strip()
            if not line.startswith("["):
                continue
            try:
                # Format: [0.00s - 4.12s] SPEAKER_00: text
                time_part, payload = line.split("] ", 1)
                speaker, text = payload.split(": ", 1)
                start_end = time_part[1:].replace("s", "").split(" - ")
                transcript_items.append(
                    {
                        "start": float(start_end[0]),
                        "end": float(start_end[1]),
                        "speaker": speaker.strip(),
                        "text": text.strip(),
                    }
                )
            except Exception:
                continue

        parsed_metrics: dict[str, dict] = {}
        current_speaker = None
        for line in metrics_raw.splitlines():
            line = line.strip()
            if line.startswith("Métricas de ") and line.endswith(":"):
                current_speaker = line[len("Métricas de "): -1].strip()
                parsed_metrics[current_speaker] = {}
                continue
            if not current_speaker:
                continue
            if line.startswith("- ") and ": " in line:
                metric_name, metric_value = line[2:].split(": ", 1)
                try:
                    parsed_metrics[current_speaker][metric_name.strip()] = float(metric_value)
                except ValueError:
                    parsed_metrics[current_speaker][metric_name.strip()] = metric_value.strip()

        return transcript_items, parsed_metrics

    def _matches_filter(item: dict) -> bool:
        if fase:
            fase_item = str(item.get("fase", ""))
            if _normalize_text(fase_item) != _normalize_text(fase):
                return False
        if postura:
            postura_item = str(item.get("postura", ""))
            if _normalize_text(postura_item) != _normalize_text(postura):
                return False
        if orador:
            orador_item = str(item.get("orador", ""))
            if _normalize_text(orador_item) != _normalize_text(orador):
                return False
        return True

    filtered = [(idx, item) for idx, item in enumerate(legacy_items) if _matches_filter(item)]
    built = []
    for idx, item in filtered:
        total = item.get("total", 0)
        max_total = item.get("max_total", 0)
        score_percent = round((total / max_total) * 100, 2) if max_total else 0.0
        fase_nombre = item.get("fase", "Unknown")
        transcript_items: list[dict] = []
        metrics_items: dict = {}
        if idx < len(legacy_prompts):
            transcript_items, metrics_items = _parse_legacy_prompt(legacy_prompts[idx])

        transcript_preview = _build_transcript_preview(transcript_items) if transcript_items else ""
        recommendation = None
        if idx < len(legacy_ai_messages):
            try:
                ai_payload = json.loads(legacy_ai_messages[idx])
                recommendation = (
                    ai_payload.get("feedback")
                    or ai_payload.get("feedback_equipo")
                    or ai_payload.get("justificacion_mejor_orador")
                )
            except Exception:
                recommendation = None

        built.append(
            {
                "segment_id": f"legacy-{project['code']}-{idx}",
                "project_code": project["code"],
                "debate_type": item.get("debate_type", project.get("debate_type", "upct")),
                "fase_id": _to_fase_id(fase_nombre),
                "fase_nombre": fase_nombre,
                "postura": item.get("postura", "Unknown"),
                "orador": item.get("orador", "Unknown"),
                "num_speakers": None,
                "duration_seconds": None,
                "analysis": {
                    "criterios": item.get("criterios", []),
                    "total": total,
                    "max_total": max_total,
                    "score_percent": score_percent,
                    "recommendation": recommendation,
                },
                "metrics_summary": _build_metrics_summary(metrics_items),
                "metrics_raw": metrics_items,
                "transcript_preview": transcript_preview,
                "transcript": transcript_items,
                "created_at": "",
            }
        )
    return built


def _build_dashboard_payload(
    project: dict,
    fase: str | None,
    postura: str | None,
    orador: str | None,
    limit: int,
    offset: int,
    include_transcript: bool,
    include_metrics: bool,
) -> dict:
    filtered_all = get_project_segments(
        project_code=project["code"],
        fase=fase,
        postura=postura,
        orador=orador,
        limit=100000,
        offset=0,
    )
    filtered_page = get_project_segments(
        project_code=project["code"],
        fase=fase,
        postura=postura,
        orador=orador,
        limit=limit,
        offset=offset,
    )

    all_items = filtered_all["items"]
    paged_items = filtered_page["items"]
    total_items = filtered_page["total"]
    limit_items = filtered_page["limit"]
    offset_items = filtered_page["offset"]

    # Backward compatibility for projects analyzed before project_segments existed.
    if not all_items:
        legacy_segments = _build_legacy_segments(project, fase, postura, orador)
        total_items = len(legacy_segments)
        all_items = legacy_segments
        paged_items = legacy_segments[offset: offset + limit]
        limit_items = limit
        offset_items = offset

    return {
        "project": project,
        "summary": build_project_dashboard_summary(all_items),
        "segments": {
            "items": _prepare_segments_for_response(
                paged_items,
                include_transcript=include_transcript,
                include_metrics=include_metrics,
            ),
            "total": total_items,
            "limit": limit_items,
            "offset": offset_items,
        },
    }


def _enforce_public_rate_limit(request: Request) -> None:
    source = request.client.host if request.client else "unknown"
    now = time.time()
    previous = _public_dashboard_rate_limit.get(source, [])
    alive = [ts for ts in previous if now - ts <= RATE_LIMIT_WINDOW_SECONDS]

    if len(alive) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="rate limit exceeded for public dashboard",
        )

    alive.append(now)
    _public_dashboard_rate_limit[source] = alive


@router.post("/status")
async def status_check():
    return {"message": "ciceron is running"}


@router.get("/debate-types")
async def get_debate_types():
    return {"debate_types": list_debate_types()}


@router.post("/login")
async def login(data: CredsInput):
    creds = {"user": data.user, "pswd": data.pswd}
    if not check_user(creds):
        raise HTTPException(status_code=401, detail="incorrect login")

    user_code = get_user_code(creds)
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": data.user,
        "exp": expire,
        "user_code": user_code,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "message": "login done!",
        "access_token": token,
        "token_type": "bearer",
        "user": data.user,
    }


@router.post("/register")
async def register(data: CredsInput):
    creds = {"user": data.user, "pswd": data.pswd}
    if not create_user(creds):
        raise HTTPException(status_code=400, detail="incorrect register")

    user_code = get_user_code(creds)
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": data.user,
        "exp": expire,
        "user_code": user_code,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "message": "register done!",
        "access_token": token,
        "token_type": "bearer",
        "user": data.user,
    }


@router.post("/new-project")
async def newproject(data: NewProjectInfo, request: Request, response: Response):
    payload = _resolve_auth_payload(request, response, data.jwt)
    user_code = payload["user_code"]

    try:
        get_debate_type(data.debate_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    project_code = create_project(
        {
            "name": data.name,
            "desc": data.description,
            "user_code": user_code,
            "debate_type": data.debate_type,
            "team_a_name": data.team_a_name,
            "team_b_name": data.team_b_name,
            "debate_topic": data.debate_topic,
        }
    )
    if project_code is None:
        raise HTTPException(status_code=500, detail="project creation failed")

    return {
        "message": "project created",
        "project_code": project_code,
        "debate_type": data.debate_type,
        "team_a_name": data.team_a_name,
        "team_b_name": data.team_b_name,
        "debate_topic": data.debate_topic,
    }


@router.post("/analyse")
async def analyse(
    request: Request,
    response: Response,
    data: AnalyseData = Depends(AnalyseData.as_form),
):
    file_path = None

    payload = _resolve_auth_payload(request, response, data.jwt)
    user_code = payload["user_code"]
    project = _resolve_project_ownership_or_fail(user_code, data.project_code)

    debate_type_id = get_project_debate_type(project["code"])
    try:
        debate_config = get_debate_type(debate_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    fase_cfg = _resolve_phase_config_or_422(debate_config, data.fase)
    postura_str = _resolve_postura_or_422(debate_config, data.postura)

    try:
        file_name = f"{uuid4()}.wav"
        file_path = UPLOAD_DIR / file_name
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(data.file.file, buffer)
        await data.file.close()

        if chats.get(project["code"]) is None:
            chats[project["code"]] = create_chat(
                project["code"],
                project["code"],
                debate_type_config=debate_config,
            )
        chat = chats[project["code"]]

        analysis_data = process_complete_analysis(str(file_path), num_speakers=data.num_speakers)
        transcription = analysis_data["transcript"]
        metrics = analysis_data["metrics"]

        save_transcription(str(file_path), transcription, "")
        save_metrics(str(file_path), metrics)

        duracion = None
        if transcription:
            duracion = transcription[-1]["end"] - transcription[0]["start"]

        if debate_type_id == "upct" and fase_cfg.id in upct_phase_enum_by_id:
            fase_arg = upct_phase_enum_by_id[fase_cfg.id]
            postura_arg = upct_postura_enum_by_value[postura_str]
        else:
            fase_arg = fase_cfg.id
            postura_arg = postura_str

        resultado = chat.send_evaluation(
            fase=fase_arg,
            postura=postura_arg,
            orador=data.orador,
            transcripcion=transcription,
            metricas=metrics,
            duracion_segundos=duracion,
        )

        criterios = []
        total = 0
        for criterio, nota in resultado.puntuaciones.items():
            anotacion = resultado.anotaciones.get(criterio, "")
            criterios.append({"criterio": criterio, "nota": nota, "anotacion": anotacion})
            total += nota

        max_total = len(resultado.puntuaciones) * debate_config.escala_max
        score_percent = round((total / max_total) * 100, 2) if max_total > 0 else 0.0

        if not create_analysis(
            {
                "fase": resultado.fase,
                "postura": resultado.postura,
                "orador": resultado.orador,
                "criterios": criterios,
                "total": total,
                "max_total": max_total,
                "project_code": project["code"],
                "debate_type": debate_type_id,
            }
        ):
            raise HTTPException(status_code=500, detail="error while saving legacy analysis")

        segment_payload = {
            "segment_id": str(uuid4()),
            "project_code": project["code"],
            "user_code": user_code,
            "debate_type": debate_type_id,
            "fase_id": fase_cfg.id,
            "fase_nombre": fase_cfg.nombre,
            "postura": postura_str,
            "orador": data.orador,
            "num_speakers": data.num_speakers,
            "duration_seconds": duracion,
            "transcript": transcription,
            "transcript_preview": _build_transcript_preview(transcription),
            "metrics_summary": _build_metrics_summary(metrics),
            "metrics_raw": metrics,
            "analysis": {
                "criterios": criterios,
                "total": total,
                "max_total": max_total,
                "score_percent": score_percent,
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if not create_project_segment(segment_payload):
            raise HTTPException(status_code=500, detail="error while saving project segment")

        return {
            "message": "analysis succeeded!",
            "fase": fase_cfg.nombre,
            "fase_id": fase_cfg.id,
            "postura": resultado.postura,
            "orador": resultado.orador,
            "criterios": criterios,
            "total": total,
            "max_total": max_total,
            "score_percent": score_percent,
            "debate_type": debate_type_id,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"error while analysing {exc}") from exc
    finally:
        if file_path is not None and file_path.exists():
            file_path.unlink()


@router.post("/quick-analyse")
async def quick_analyse(data: QuickAnalyseData = Depends(QuickAnalyseData.as_form)):
    file_path = None

    try:
        try:
            debate_config = get_debate_type(data.debate_type)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        fase_cfg = _resolve_phase_config_or_422(debate_config, data.fase)
        postura_str = _resolve_postura_or_422(debate_config, data.postura)

        file_name = f"quick_{uuid4()}.wav"
        file_path = UPLOAD_DIR / file_name
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(data.file.file, buffer)
        await data.file.close()

        temp_session_id = f"quick_{id(data)}"
        chat = create_chat(temp_session_id, temp_session_id, debate_type_config=debate_config)

        analysis_data = process_complete_analysis(str(file_path), num_speakers=data.num_speakers)
        transcription = analysis_data["transcript"]
        metrics = analysis_data["metrics"]

        duracion = None
        if transcription:
            duracion = transcription[-1]["end"] - transcription[0]["start"]

        if data.debate_type == "upct" and fase_cfg.id in upct_phase_enum_by_id:
            fase_arg = upct_phase_enum_by_id[fase_cfg.id]
            postura_arg = upct_postura_enum_by_value[postura_str]
        else:
            fase_arg = fase_cfg.id
            postura_arg = postura_str

        resultado = chat.send_evaluation(
            fase=fase_arg,
            postura=postura_arg,
            orador=data.orador,
            transcripcion=transcription,
            metricas=metrics,
            duracion_segundos=duracion,
        )

        criterios = []
        total = 0
        for criterio, nota in resultado.puntuaciones.items():
            anotacion = resultado.anotaciones.get(criterio, "")
            criterios.append({"criterio": criterio, "nota": nota, "anotacion": anotacion})
            total += nota

        max_total = len(resultado.puntuaciones) * debate_config.escala_max

        chat.clear_history()
        return {
            "message": "quick analysis succeeded!",
            "fase": fase_cfg.nombre,
            "fase_id": fase_cfg.id,
            "postura": resultado.postura,
            "orador": resultado.orador,
            "criterios": criterios,
            "total": total,
            "max_total": max_total,
            "debate_type": data.debate_type,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"error while analysing {exc}") from exc
    finally:
        if file_path is not None and file_path.exists():
            file_path.unlink()


@router.post("/get-projects")
async def getprojects(data: AuthDataProjects, request: Request, response: Response):
    payload = _resolve_auth_payload(request, response, data.jwt)

    # Legacy response is preserved in "result" while adding pagination metadata.
    legacy_result = get_projects({"user_code": payload["user_code"]})
    paged = get_projects_paginated(
        user_code=payload["user_code"],
        q=data.q,
        debate_type=data.debate_type,
        limit=data.limit,
        offset=data.offset,
    )

    return {
        "message": "here are your projects",
        "result": legacy_result,
        "items": paged["items"],
        "total": paged["total"],
        "limit": paged["limit"],
        "offset": paged["offset"],
    }


@router.post("/get-project")
async def getproject(data: AuthDataProject, request: Request, response: Response):
    payload = _resolve_auth_payload(request, response, data.jwt)
    project = _resolve_project_ownership_or_fail(payload["user_code"], data.project_code)

    result = get_project({"user_code": payload["user_code"], "project_code": data.project_code})
    response_payload = {
        "message": f"here is project {data.project_code}",
        "project": project,
        "content": result,
    }

    if data.include_segments:
        dashboard = _build_dashboard_payload(
            project=project,
            fase=data.fase,
            postura=data.postura,
            orador=data.orador,
            limit=data.limit,
            offset=data.offset,
            include_transcript=data.include_transcript,
            include_metrics=data.include_metrics,
        )
        response_payload["dashboard"] = dashboard

    return response_payload


@router.post("/projects/{project_code}/share-links")
async def create_share_link(
    project_code: str,
    data: ShareLinkCreateData,
    request: Request,
    response: Response,
):
    payload = _resolve_auth_payload(request, response, data.jwt)
    project = _resolve_project_ownership_or_fail(payload["user_code"], project_code)

    now = datetime.now(timezone.utc)
    expires_at = data.expires_at or (now + timedelta(days=DEFAULT_SHARE_LINK_DAYS))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise HTTPException(status_code=422, detail="expires_at must be in the future")

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    share_id = str(uuid4())

    created = create_project_share_link(
        {
            "share_id": share_id,
            "project_code": project["code"],
            "owner_user_code": payload["user_code"],
            "token_hash": token_hash,
            "token_prefix": raw_token[:8],
            "allow_full_transcript": data.allow_full_transcript,
            "allow_raw_metrics": data.allow_raw_metrics,
            "expires_at": expires_at.isoformat(),
            "revoked": False,
            "created_at": now.isoformat(),
            "revoked_at": None,
        }
    )
    if not created:
        raise HTTPException(status_code=500, detail="failed to create share link")

    public_url = str(request.base_url).rstrip("/") + f"/api/v1/public/dashboard/{raw_token}"
    return {
        "share_id": share_id,
        "public_url": public_url,
        "expires_at": expires_at.isoformat(),
        "revoked": False,
    }


@router.get("/projects/{project_code}/share-links")
async def list_share_links(
    project_code: str,
    request: Request,
    response: Response,
    jwt: str | None = Query(default=None),
):
    payload = _resolve_auth_payload(request, response, jwt)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)

    links = list_project_share_links(project_code, payload["user_code"])
    public_links = []
    for link in links:
        public_links.append(
            {
                "share_id": link.get("share_id"),
                "project_code": link.get("project_code"),
                "token_prefix": link.get("token_prefix"),
                "allow_full_transcript": link.get("allow_full_transcript", False),
                "allow_raw_metrics": link.get("allow_raw_metrics", False),
                "expires_at": link.get("expires_at"),
                "revoked": link.get("revoked", False),
                "created_at": link.get("created_at"),
                "revoked_at": link.get("revoked_at"),
            }
        )
    return {"items": public_links, "total": len(public_links)}


@router.delete("/projects/{project_code}/share-links/{share_id}")
async def revoke_share_link(
    project_code: str,
    share_id: str,
    request: Request,
    response: Response,
    jwt: str | None = Query(default=None),
):
    payload = _resolve_auth_payload(request, response, jwt)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)

    revoked = revoke_project_share_link(project_code, payload["user_code"], share_id)
    if not revoked:
        raise HTTPException(status_code=404, detail="share link not found")

    return {"message": "share link revoked", "share_id": share_id, "revoked": True}


@router.get("/public/dashboard/{token}")
async def public_dashboard(
    token: str,
    request: Request,
    fase: str | None = Query(default=None),
    postura: str | None = Query(default=None),
    orador: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    _enforce_public_rate_limit(request)

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    share_link = get_project_share_link_by_token_hash(token_hash)
    if not share_link:
        raise HTTPException(status_code=404, detail="share link not found")

    if share_link.get("revoked", False):
        raise HTTPException(status_code=410, detail="share link revoked")

    expires_at_raw = share_link.get("expires_at")
    expires_at = datetime.fromisoformat(expires_at_raw)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="share link expired")

    project = get_project_by_code(share_link["project_code"])
    if not project:
        raise HTTPException(status_code=404, detail="project not found")

    print(
        "public-dashboard-access",
        {
            "share_id": share_link.get("share_id"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ip_hash": hashlib.sha256((request.client.host if request.client else "").encode("utf-8")).hexdigest()[:16],
        },
    )

    dashboard = _build_dashboard_payload(
        project=project,
        fase=fase,
        postura=postura,
        orador=orador,
        limit=limit,
        offset=offset,
        include_transcript=True,
        include_metrics=share_link.get("allow_raw_metrics", False),
    )

    return {
        "project": dashboard["project"],
        "summary": dashboard["summary"],
        "segments": dashboard["segments"],
    }
