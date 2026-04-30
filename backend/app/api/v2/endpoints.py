import asyncio
from datetime import datetime, timezone
from pathlib import Path
import shutil
from uuid import uuid4

from app.api.v1.endpoints import (
    _enforce_upload_size_or_413,
    _resolve_auth_payload,
    _resolve_phase_config_or_422,
    _resolve_postura_or_422,
    _resolve_project_ownership_or_fail,
)
from app.api.v1.models import DashBoardData, InstantChatData
from app.api.v2.models import AnalysisJobCreateData
from app.core.database import (
    build_project_dashboard_summary,
    create_analysis_job,
    get_analysis_job,
    get_project_segment,
    get_project_segments,
    list_analysis_jobs,
    list_projects_for_user,
    update_analysis_job,
)
from app.services.analysis_runtime import ANALYSIS_PIPELINE_LOCK, run_project_analysis
from data.debate_types import get_debate_type
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, UploadFile
from app.api.v2.dashboard.dashboard import get_metrics_transcription_scores_formatted, talk_to_chat_session
from starlette.concurrency import run_in_threadpool

router = APIRouter()
UPLOAD_DIR = Path("uploads/audios")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _store_uploaded_file(upload: UploadFile, destination: Path) -> None:
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)


def _project_resource(project: dict) -> dict:
    segments_page = get_project_segments(project_code=project["code"], limit=100000, offset=0)
    summary = build_project_dashboard_summary(segments_page["items"])
    return {
        "project_code": project["code"],
        "name": project.get("name"),
        "description": project.get("desc", ""),
        "debate_type": project.get("debate_type", "upct"),
        "team_a_name": project.get("team_a_name", "Equipo A"),
        "team_b_name": project.get("team_b_name", "Equipo B"),
        "debate_topic": project.get("debate_topic", ""),
        "created_at": project.get("created_at"),
        "summary": summary,
    }


def _segment_resource(segment: dict, include_transcript: bool, include_metrics: bool) -> dict:
    item = {
        "segment_id": segment.get("segment_id"),
        "project_code": segment.get("project_code"),
        "debate_type": segment.get("debate_type"),
        "fase": {
            "id": segment.get("fase_id"),
            "name": segment.get("fase_nombre"),
        },
        "postura": segment.get("postura"),
        "orador": segment.get("orador"),
        "num_speakers": segment.get("num_speakers"),
        "duration_seconds": segment.get("duration_seconds"),
        "transcript_preview": segment.get("transcript_preview", ""),
        "analysis": segment.get("analysis", {}),
        "metrics_summary": segment.get("metrics_summary", {}),
        "created_at": segment.get("created_at"),
    }
    if include_transcript:
        item["transcript"] = segment.get("transcript", [])
    if include_metrics:
        item["metrics_raw"] = segment.get("metrics_raw", {})
    return item


def _analysis_job_resource(job: dict) -> dict:
    return {
        "job_id": job.get("job_id"),
        "project_code": job.get("project_code"),
        "status": job.get("status"),
        "created_at": job.get("created_at"),
        "updated_at": job.get("updated_at"),
        "submitted_by": job.get("submitted_by"),
        "fase": job.get("fase"),
        "postura": job.get("postura"),
        "orador": job.get("orador"),
        "num_speakers": job.get("num_speakers"),
        "segment_id": job.get("segment_id"),
        "error": job.get("error"),
        "result": job.get("result"),
    }


async def _run_analysis_job(
    *,
    job_id: str,
    user_code: str,
    project: dict,
    debate_type_id: str,
    debate_config,
    fase_cfg,
    postura_str: str,
    orador: str,
    num_speakers: int,
    file_path: str,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    update_analysis_job(job_id, {"status": "running", "updated_at": now})
    try:
        async with ANALYSIS_PIPELINE_LOCK:
            result = await run_in_threadpool(
                run_project_analysis,
                project=project,
                user_code=user_code,
                debate_type_id=debate_type_id,
                debate_config=debate_config,
                fase_cfg=fase_cfg,
                postura_str=postura_str,
                orador=orador,
                num_speakers=num_speakers,
                file_path=file_path,
            )
        update_analysis_job(
            job_id,
            {
                "status": "succeeded",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "segment_id": result.get("segment_id"),
                "result": result,
                "error": None,
            },
        )
    except Exception as exc:
        update_analysis_job(
            job_id,
            {
                "status": "failed",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "error": str(exc),
            },
        )
    finally:
        path = Path(file_path)
        if path.exists():
            path.unlink()


@router.get("/projects")
async def get_projects_resource(
    request: Request,
    response: Response,
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    projects = list_projects_for_user(payload["user_code"])
    return {"items": [_project_resource(project) for project in projects], "total": len(projects)}


@router.get("/projects/{project_code}")
async def get_project_resource(
    project_code: str,
    request: Request,
    response: Response,
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    project = _resolve_project_ownership_or_fail(payload["user_code"], project_code)
    return _project_resource(project)


@router.get("/projects/{project_code}/segments")
async def get_project_segments_resource(
    project_code: str,
    request: Request,
    response: Response,
    fase: str | None = Query(default=None),
    postura: str | None = Query(default=None),
    orador: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    include_transcript: bool = Query(default=False),
    include_metrics: bool = Query(default=False),
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)
    page = get_project_segments(
        project_code=project_code,
        fase=fase,
        postura=postura,
        orador=orador,
        limit=limit,
        offset=offset,
    )
    return {
        "items": [
            _segment_resource(item, include_transcript=include_transcript, include_metrics=include_metrics)
            for item in page["items"]
        ],
        "total": page["total"],
        "limit": page["limit"],
        "offset": page["offset"],
    }


@router.get("/projects/{project_code}/segments/{segment_id}")
async def get_project_segment_resource(
    project_code: str,
    segment_id: str,
    request: Request,
    response: Response,
    include_transcript: bool = Query(default=True),
    include_metrics: bool = Query(default=False),
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)
    segment = get_project_segment(project_code, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="segment not found")
    return _segment_resource(
        segment,
        include_transcript=include_transcript,
        include_metrics=include_metrics,
    )


@router.get("/projects/{project_code}/transcripts")
async def get_project_transcripts_resource(
    project_code: str,
    request: Request,
    response: Response,
    fase: str | None = Query(default=None),
    postura: str | None = Query(default=None),
    orador: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)
    page = get_project_segments(
        project_code=project_code,
        fase=fase,
        postura=postura,
        orador=orador,
        limit=limit,
        offset=offset,
    )
    items = []
    for segment in page["items"]:
        items.append(
            {
                "segment_id": segment.get("segment_id"),
                "project_code": segment.get("project_code"),
                "fase": {
                    "id": segment.get("fase_id"),
                    "name": segment.get("fase_nombre"),
                },
                "postura": segment.get("postura"),
                "orador": segment.get("orador"),
                "transcript_preview": segment.get("transcript_preview", ""),
                "transcript": segment.get("transcript", []),
                "created_at": segment.get("created_at"),
            }
        )
    return {"items": items, "total": page["total"], "limit": page["limit"], "offset": page["offset"]}


@router.get("/projects/{project_code}/analyses")
async def get_project_analyses_resource(
    project_code: str,
    request: Request,
    response: Response,
    fase: str | None = Query(default=None),
    postura: str | None = Query(default=None),
    orador: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)
    page = get_project_segments(
        project_code=project_code,
        fase=fase,
        postura=postura,
        orador=orador,
        limit=limit,
        offset=offset,
    )
    items = []
    for segment in page["items"]:
        items.append(
            {
                "segment_id": segment.get("segment_id"),
                "project_code": segment.get("project_code"),
                "fase": {
                    "id": segment.get("fase_id"),
                    "name": segment.get("fase_nombre"),
                },
                "postura": segment.get("postura"),
                "orador": segment.get("orador"),
                "analysis": segment.get("analysis", {}),
                "metrics_summary": segment.get("metrics_summary", {}),
                "created_at": segment.get("created_at"),
            }
        )
    return {"items": items, "total": page["total"], "limit": page["limit"], "offset": page["offset"]}


@router.post("/projects/{project_code}/analysis-jobs")
async def create_analysis_job_resource(
    project_code: str,
    request: Request,
    response: Response,
    data: AnalysisJobCreateData = Depends(AnalysisJobCreateData.as_form),
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    user_code = payload["user_code"]
    project = _resolve_project_ownership_or_fail(user_code, project_code)
    debate_type_id = project.get("debate_type", "upct")
    try:
        debate_config = get_debate_type(debate_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    fase_cfg = _resolve_phase_config_or_422(debate_config, data.fase)
    postura_str = _resolve_postura_or_422(debate_config, data.postura)
    _enforce_upload_size_or_413(data.file)

    file_name = f"{uuid4()}.wav"
    file_path = UPLOAD_DIR / file_name
    await run_in_threadpool(_store_uploaded_file, data.file, file_path)
    await data.file.close()

    now = datetime.now(timezone.utc).isoformat()
    job_id = str(uuid4())
    created = create_analysis_job(
        {
            "job_id": job_id,
            "project_code": project_code,
            "submitted_by": user_code,
            "status": "queued",
            "created_at": now,
            "updated_at": now,
            "fase": fase_cfg.id,
            "postura": postura_str,
            "orador": data.orador,
            "num_speakers": data.num_speakers,
            "file_path": str(file_path),
            "segment_id": None,
            "error": None,
            "result": None,
        }
    )
    if not created:
        raise HTTPException(status_code=500, detail="failed to create analysis job")

    asyncio.create_task(
        _run_analysis_job(
            job_id=job_id,
            user_code=user_code,
            project=project,
            debate_type_id=debate_type_id,
            debate_config=debate_config,
            fase_cfg=fase_cfg,
            postura_str=postura_str,
            orador=data.orador,
            num_speakers=data.num_speakers,
            file_path=str(file_path),
        )
    )

    response.status_code = 202
    return _analysis_job_resource(get_analysis_job(job_id) or {"job_id": job_id, "project_code": project_code, "status": "queued", "created_at": now, "updated_at": now, "submitted_by": user_code, "fase": fase_cfg.id, "postura": postura_str, "orador": data.orador, "num_speakers": data.num_speakers})


@router.get("/projects/{project_code}/analysis-jobs")
async def list_analysis_jobs_resource(
    project_code: str,
    request: Request,
    response: Response,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)
    page = list_analysis_jobs(project_code=project_code, limit=limit, offset=offset)
    return {
        "items": [_analysis_job_resource(item) for item in page["items"]],
        "total": page["total"],
        "limit": page["limit"],
        "offset": page["offset"],
    }


@router.get("/projects/{project_code}/analysis-jobs/{job_id}")
async def get_analysis_job_resource(
    project_code: str,
    job_id: str,
    request: Request,
    response: Response,
):
    payload = _resolve_auth_payload(request, response, legacy_jwt=None)
    _resolve_project_ownership_or_fail(payload["user_code"], project_code)
    job = get_analysis_job(job_id)
    if not job or job.get("project_code") != project_code:
        raise HTTPException(status_code=404, detail="analysis job not found")
    return _analysis_job_resource(job)


@router.post("/dashboard/info")
async def dashboard_info(
    request: Request,
    response: Response,
    data: DashBoardData,
):
    payload = _resolve_auth_payload(request, response, data.jwt)
    user_code = payload["user_code"]
    _resolve_project_ownership_or_fail(user_code, data.project_code)
    try:
        output = get_metrics_transcription_scores_formatted(data.project_code)
        return output
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500, detail="failed to build dashboard")


@router.post("/dashboard/instant-chat")
async def instant_chat(
    request: Request,
    response: Response,
    data: InstantChatData
):
    payload = _resolve_auth_payload(request, response, data.jwt)
    user_code = payload["user_code"]
    _resolve_project_ownership_or_fail(user_code, data.project_code)
    try:
        answer = talk_to_chat_session(data.project_code, data.message)
        return {"status": "succeeded", "message": answer}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="failed to instant chat")
