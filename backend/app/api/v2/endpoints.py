from app.api.v1.endpoints import _resolve_auth_payload, _resolve_project_ownership_or_fail
from app.api.v1.models import DashBoardData, InstantChatData
from fastapi import APIRouter, HTTPException, Request, Response
from app.api.v2.dashboard.dashboard import get_metrics_transcription_scores_formatted, talk_to_chat_session

router = APIRouter()


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
