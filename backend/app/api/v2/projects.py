from app.api.v2.models import ProjectModel
from app.core.database import create_analysis, create_project, check_team, save_audio_path, check_user_existence, get_audio_path, save_transcription, get_transcription, save_metrics, get_postura, get_orador, get_saved_transcription_diarization, get_saved_metrics
from app.processors.pipeline import DebateFase, Postura, create_chat
from app.services.transcription import split_audio
from app.services.metrics import process_complete_analysis

from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends, Form
import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from pathlib import Path
import shutil

load_dotenv

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

UPLOAD_DIR = Path("uploads/audios")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

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

chats = {}


@router.post("/projects")
async def create_project(data: ProjectModel):
    try:
        dec_jwt = jwt.decode(data.jwt, SECRET_KEY, ALGORITHM)
        user_code = dec_jwt["user_code"]
        payload = {"name": data.name,
                   "desc": data.desc, "user_code": user_code}
        project_code = create_project(payload)
        return {"status": "project creation succeeded", "project_code": project_code}
    except Exception as e:
        raise HTTPException(500, e)


@router.post("/projects/{project_code}/audio")
async def upload_audio(
        project_code: str,
        file: UploadFile,
        enc_jwt: str,
        fase: str = Form(...),
        equipo: str = Form(...),
        orador: str = Form(...),
        num_speakers: int = Form(...)):
    try:
        dec_jwt = jwt.decode(enc_jwt, SECRET_KEY, ALGORITHM)
        if not check_user_existence(dec_jwt["user_code"]):
            raise HTTPException(401, "invalid jwt")

        file_name = f"{abs(hash(f'{project_code}-{fase}-{equipo}'))}"
        file_path = UPLOAD_DIR / file_name

        if fase not in ["Introducción", "Refutación 1", "Refutación 2", "Conclusión", "Final"]:
            raise ValueError(f"{fase} is not a valid phase")
        if not check_team(project_code, equipo):
            raise ValueError(f"{equipo} is not a valid team")

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        await file.close()

        save_audio_path(file_path, project_code, fase,
                        equipo, orador, num_speakers)
        return {"status": "succeeded"}

    except Exception as e:
        raise HTTPException(500, e)


@router.get("/projects/{project_code}/transcription")
async def get_transcription(
        project_code: str,
        enc_jwt: str,
        fase: str,
        equipo: str,
        num_speakers: int):
    try:
        dec_jwt = jwt.decode(enc_jwt, SECRET_KEY, ALGORITHM)
        if not check_user_existence(dec_jwt["user_code"]):
            raise HTTPException(401, "invalid jwt")

        file_path = get_audio_path(project_code, fase, equipo)
        if not file_path:
            raise HTTPException(500)

        analysis_data = split_audio(str(file_path), num_speakers)

        transcript = analysis_data["transcript"]
        diarization_raw = analysis_data["diarization_raw"]

        save_transcription(file_path, transcript, diarization_raw)

        return {"status": "succeeded", "transcript": transcript, "diarization_raw": diarization_raw}

    except Exception as e:
        HTTPException(500, e)


@router.get("/projects/{project_code}/prosody")
async def get_prosody(
        project_code: str,
        enc_jwt: str,
        fase: str,
        equipo: str):
    try:
        dec_jwt = jwt.decode(enc_jwt, SECRET_KEY, ALGORITHM)
        if not check_user_existence(dec_jwt["user_code"]):
            raise HTTPException(401, "invalid jwt")

        file_path = get_audio_path(project_code, fase, equipo)
        data = get_transcription(file_path)

        result = process_complete_analysis(
            file_path, data["transcript"], data["diarization"])

        save_metrics(file_path, result)

        return {"status": "succeeded", "metrics": result}
    except Exception as e:
        HTTPException(500, e)


@router.get("/projects/{project_code}/interepretation")
async def get_interpretation(
        project_code: str,
        enc_jwt: str,
        fase: str,
        equipo: str):
    try:
        dec_jwt = jwt.decode(enc_jwt, SECRET_KEY, ALGORITHM)
        if not check_user_existence(dec_jwt["user_code"]):
            raise HTTPException(401, "invalid jwt")

        file_path = get_audio_path(project_code, fase, equipo)
        if fase not in ["Introducción", "Refutación 1", "Refutación 2", "Conclusión", "Final"]:
            raise ValueError(f"{fase} is not a valid phase")
        postura = get_postura(equipo)
        if postura not in ["A Favor", "En Contra"]:
            raise ValueError(f"{postura} is not valid")

        fase = fases[fase]
        postura = posturas[postura]
        orador, num_speakers = get_orador(file_path)

        if chats.get(project_code) == None:
            chat = create_chat(project_code, project_code)
            chats[project_code] = chat
        else:
            chat = chats[project_code]

        transcription, diarization = get_saved_transcription_diarization(
            file_path)

        metrics = get_saved_metrics(file_path)
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
        HTTPException(500, e)
