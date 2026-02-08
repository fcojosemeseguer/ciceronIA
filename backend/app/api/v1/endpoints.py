from app.core.database import create_user, check_user, get_user_code, create_project, create_analysis, get_projects, get_project
from app.api.v1.models import CredsInput, NewProjectInfo, AnalyseData, AuthData, AuthDataProject
from app.processors.pipeline import create_chat, DebateFase, Postura
from app.services.metrics import process_complete_analysis

from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
import os
from datetime import datetime, timedelta, timezone
import jwt
from dotenv import load_dotenv
from pathlib import Path
import shutil

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

UPLOAD_DIR = Path("uploads/audios")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

chats = {}

fases = {
    "Introducción": DebateFase.INTRO,
    "Refutación 1": DebateFase.REF1,
    "Refutación 2": DebateFase.REF2,
    "Conclusión": DebateFase.CONCLUSION,
    "Final": DebateFase.FINAL
}

posturas = {
    "A Favor": Postura.FAVOR,
    "En Contra": Postura.CONTRA
}

key_metrics_names = [
    "F0semitoneFrom27.5Hz_sma3nz_stddevNorm",  # Expresividad
    "loudness_sma3_amean",                     # Proyección
    "loudness_sma3_stddevNorm",                # Énfasis
    "loudnessPeaksPerSec",                     # Velocidad
    "VoicedSegmentsPerSec",                    # Ritmo
    "MeanUnvoicedSegmentLength",               # Silencios
    "jitterLocal_sma3nz_amean",                # Seguridad (Jitter)
    "shimmerLocaldB_sma3nz_amean"              # Seguridad (Shimmer)
]


@router.post("/status")
async def status():
    return {"message": "ciceron is running"}


@router.post("/login")
async def login(data: CredsInput):
    creds = {"user": data.user, "pswd": data.pswd}
    user_code = get_user_code(creds)
    if check_user(creds):
        expire = datetime.now(timezone.utc) + \
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": data.user,  # El "sujeto" del token
            "exp": expire,     # Fecha de expiración
            "user_code": user_code
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return {
            "message": "login done!",
            "access_token": token,
            "token_type": "bearer",
            "user": data.user
        }
    else:
        raise HTTPException(401, "incorrect login")


@router.post("/register")
async def register(data: CredsInput):
    creds = {"user": data.user, "pswd": data.pswd}
    if create_user(creds):
        user_code = get_user_code(creds)
        expire = datetime.now(timezone.utc) + \
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": data.user,  # El "sujeto" del token
            "exp": expire,     # Fecha de expiración
            "user_code": user_code
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return {
            "message": "register done!",
            "access_token": token,
            "token_type": "bearer",
            "user": data.user
        }
    else:
        raise HTTPException(400, "incorrect register")


@router.post("/new-project")
async def newproject(data: NewProjectInfo):
    try:
        payload = jwt.decode(data.jwt, SECRET_KEY, algorithms=[ALGORITHM])
        user_code = payload["user_code"]
        project_code = create_project(
            {"name": data.name, "desc": data.description, "user_code": user_code})
        if project_code is not None:
            return {"message": "project created", "project_code": project_code}
    except Exception as e:
        raise HTTPException(400, detail=str(e))


@router.post("/analyse")
async def analyse(data: AnalyseData = Depends(AnalyseData.as_form)):
    file_path = None
    try:
        project_code = data.project_code
        data.fase
        data.postura
        file_name = f"{abs(hash(f'{project_code}-{data.fase}-{data.postura}'))}.wav"
        file_path = UPLOAD_DIR / file_name

        if data.fase not in ["Introducción", "Refutación 1", "Refutación 2", "Conclusión", "Final"]:
            raise ValueError(f"{data.fase} is not a valid phase")
        if data.postura not in ["A Favor", "En Contra"]:
            raise ValueError(f"{data.postura} is not valid")

        fase = fases[data.fase]
        postura = posturas[data.postura]
        orador = data.orador
        num_speakers = data.num_speakers

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(data.file.file, buffer)
        await data.file.close()

        if chats.get(project_code) is None:
            chat = create_chat(project_code, project_code)
            chats[project_code] = chat
        else:
            chat = chats[project_code]

        analysis_data = process_complete_analysis(
            str(file_path), num_speakers=num_speakers)

        transcription = analysis_data["transcript"]
        metrics = analysis_data["metrics"]

        if transcription:
            duracion = transcription[-1]["end"] - transcription[0]["start"]
        else:
            duracion = None

        resultado = chat.send_evaluation(
            fase=fase,
            postura=postura,
            orador=orador,
            transcripcion=transcription,
            metricas=metrics,
            duracion_segundos=duracion
        )

        criterios = []
        total = 0
        for criterio, nota in resultado.puntuaciones.items():
            anotacion = resultado.anotaciones.get(criterio, "")
            criterios.append({
                "criterio": criterio,
                "nota": nota,
                "anotacion": anotacion
            })
            total += nota
        if create_analysis({
            "fase": resultado.fase,
            "postura": resultado.postura,
            "orador": resultado.orador,
            "criterios": criterios,
            "total": total,
            "max_total": len(resultado.puntuaciones) * 4,
            "project_code": project_code
        }):
            return {
                "message": "analysis succeeded!",
                "fase": resultado.fase,
                "postura": resultado.postura,
                "orador": resultado.orador,
                "criterios": criterios,
                "total": total,
                "max_total": len(resultado.puntuaciones) * 4
            }
        else:
            raise RuntimeError("error while saving data")

    except Exception as e:
        raise HTTPException(
            500, detail=f"error while analysing {e}")
    finally:
        if file_path is not None and file_path.exists():
            file_path.unlink()


@router.post("/get-projects")
async def getprojects(data: AuthData):
    payload = jwt.decode(data.jwt, SECRET_KEY, algorithms=[ALGORITHM])
    result = get_projects({"user_code": payload["user_code"]})
    if result is None:
        raise HTTPException(401)
    else:
        return {"message": "here are your projects", "result": result}


@router.post("/get-project")
async def getproject(data: AuthDataProject):
    try:
        payload = jwt.decode(data.jwt, SECRET_KEY, algorithms=[ALGORITHM])
        result = get_project(
            {"user_code": payload["user_code"], "project_code": data.project_code})
        return {"message": f"here is project {data.project_code}", "content": result}
    except Exception as e:
        print(f"error {e}")
        HTTPException(500, f"error {e}")
