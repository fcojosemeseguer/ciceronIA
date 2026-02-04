from fastapi import APIRouter, File, UploadFile

router = APIRouter()


@router.post("/status")
async def status():
    return {"message": "ciceron is running"}
