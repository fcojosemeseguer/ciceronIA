from app.api.v1.endpoints import _resolve_auth_payload
from app.api.v1.models import DashBoardData
from fastapi import APIRouter, HTTPException, Request, Response
from app.api.v2.dashboard.dashboard import get_metrics_transcription_scores_formatted

router = APIRouter()


@router.post("/dashboard/info")
async def dashboard_info(
    request: Request,
    response: Response,
    data: DashBoardData,
):
    _resolve_auth_payload(request, response, data.jwt)
    try:
        output = get_metrics_transcription_scores_formatted(data.project_code)
        return output
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="failed to build dashboard")
