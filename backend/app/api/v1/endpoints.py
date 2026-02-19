from app.core.database import (
    create_user, check_user, get_user_code, create_project,
    create_analysis, get_projects, get_project, get_project_debate_type,
)
from app.api.v1.models import CredsInput, NewProjectInfo, AnalyseData, QuickAnalyseData, AuthData, AuthDataProject
from app.processors.pipeline import create_chat, DebateFase, Postura
from app.services.metrics import process_complete_analysis
from data.debate_types import get_debate_type, list_debate_types, DEFAULT_DEBATE_TYPE

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

# Backward-compatible maps for UPCT (used as fallback)
_upct_fases = {
    "Introducción": DebateFase.INTRO,
    "Refutación 1": DebateFase.REF1,
    "Refutación 2": DebateFase.REF2,
    "Conclusión": DebateFase.CONCLUSION,
    "Final": DebateFase.FINAL
}

_upct_posturas = {
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


@router.get("/debate-types")
async def get_debate_types():
    """Lista todos los tipos de debate disponibles con info resumida."""
    return {"debate_types": list_debate_types()}


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

        # Validar que el tipo de debate existe
        try:
            get_debate_type(data.debate_type)
        except ValueError as e:
            raise HTTPException(400, detail=str(e))

        project_code = create_project({
            "name": data.name,
            "desc": data.description,
            "user_code": user_code,
            "debate_type": data.debate_type,
            "team_a_name": data.team_a_name,
            "team_b_name": data.team_b_name,
            "debate_topic": data.debate_topic,
        })
        if project_code is not None:
            return {
                "message": "project created",
                "project_code": project_code,
                "debate_type": data.debate_type,
                "team_a_name": data.team_a_name,
                "team_b_name": data.team_b_name,
                "debate_topic": data.debate_topic,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, detail=str(e))


@router.post("/analyse")
async def analyse(data: AnalyseData = Depends(AnalyseData.as_form)):
    file_path = None
    try:
        project_code = data.project_code

        # Obtener tipo de debate del proyecto
        debate_type_id = get_project_debate_type(project_code)
        try:
            debate_config = get_debate_type(debate_type_id)
        except ValueError:
            raise HTTPException(400, detail=f"Project has invalid debate type: {debate_type_id}")

        # Validar fase contra la config del tipo de debate
        fase_nombre = data.fase
        fase_config = debate_config.get_fase_by_nombre(fase_nombre)
        if fase_config is None:
            # Intentar buscar por id
            fase_config = debate_config.get_fase_by_id(fase_nombre)
        if fase_config is None:
            fases_validas = [f.nombre for f in debate_config.fases]
            raise ValueError(
                f"'{fase_nombre}' is not a valid phase for {debate_type_id}. "
                f"Valid phases: {fases_validas}"
            )

        # Validar postura
        postura_str = data.postura
        if postura_str not in debate_config.get_posturas_validas():
            raise ValueError(
                f"'{postura_str}' is not valid. "
                f"Valid options: {debate_config.get_posturas_validas()}"
            )

        orador = data.orador
        num_speakers = data.num_speakers

        file_name = f"{abs(hash(f'{project_code}-{data.fase}-{data.postura}'))}.wav"
        file_path = UPLOAD_DIR / file_name

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(data.file.file, buffer)
        await data.file.close()

        # Crear o recuperar ChatSession con la config del tipo de debate
        if chats.get(project_code) is None:
            chat = create_chat(
                project_code, project_code,
                debate_type_config=debate_config
            )
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

        # Para UPCT: pasar enums (retrocompatibilidad). Para otros: pasar strings.
        if debate_type_id == "upct" and fase_nombre in _upct_fases:
            fase_arg = _upct_fases[fase_nombre]
            postura_arg = _upct_posturas[postura_str]
        else:
            fase_arg = fase_nombre
            postura_arg = postura_str

        resultado = chat.send_evaluation(
            fase=fase_arg,
            postura=postura_arg,
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

        max_total = len(resultado.puntuaciones) * debate_config.escala_max

        if create_analysis({
            "fase": resultado.fase,
            "postura": resultado.postura,
            "orador": resultado.orador,
            "criterios": criterios,
            "total": total,
            "max_total": max_total,
            "project_code": project_code,
            "debate_type": debate_type_id,
        }):
            return {
                "message": "analysis succeeded!",
                "fase": resultado.fase,
                "postura": resultado.postura,
                "orador": resultado.orador,
                "criterios": criterios,
                "total": total,
                "max_total": max_total,
                "debate_type": debate_type_id,
            }
        else:
            raise RuntimeError("error while saving data")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            500, detail=f"error while analysing {e}")
    finally:
        if file_path is not None and file_path.exists():
            file_path.unlink()


@router.post("/quick-analyse")
async def quick_analyse(data: QuickAnalyseData = Depends(QuickAnalyseData.as_form)):
    """
    Análisis rápido sin proyecto asociado.
    No requiere autenticación. No guarda resultados en BD.
    El debate_type se pasa directamente en el request (default: upct).
    """
    file_path = None
    try:
        # Validar tipo de debate
        debate_type_id = data.debate_type
        try:
            debate_config = get_debate_type(debate_type_id)
        except ValueError as e:
            raise HTTPException(400, detail=str(e))

        # Validar fase
        fase_nombre = data.fase
        fase_config = debate_config.get_fase_by_nombre(fase_nombre)
        if fase_config is None:
            fase_config = debate_config.get_fase_by_id(fase_nombre)
        if fase_config is None:
            fases_validas = [f.nombre for f in debate_config.fases]
            raise ValueError(
                f"'{fase_nombre}' is not a valid phase for {debate_type_id}. "
                f"Valid phases: {fases_validas}"
            )

        # Validar postura
        postura_str = data.postura
        if postura_str not in debate_config.get_posturas_validas():
            raise ValueError(
                f"'{postura_str}' is not valid. "
                f"Valid options: {debate_config.get_posturas_validas()}"
            )

        orador = data.orador
        num_speakers = data.num_speakers

        file_name = f"quick_{abs(hash(f'{data.fase}-{data.postura}-{id(data)}'))}.wav"
        file_path = UPLOAD_DIR / file_name

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(data.file.file, buffer)
        await data.file.close()

        # Crear ChatSession efímera (no se guarda en el dict chats)
        temp_session_id = f"quick_{id(data)}"
        chat = create_chat(
            temp_session_id, temp_session_id,
            debate_type_config=debate_config
        )

        analysis_data = process_complete_analysis(
            str(file_path), num_speakers=num_speakers)

        transcription = analysis_data["transcript"]
        metrics = analysis_data["metrics"]

        if transcription:
            duracion = transcription[-1]["end"] - transcription[0]["start"]
        else:
            duracion = None

        # Para UPCT: pasar enums. Para otros: strings.
        if debate_type_id == "upct" and fase_nombre in _upct_fases:
            fase_arg = _upct_fases[fase_nombre]
            postura_arg = _upct_posturas[postura_str]
        else:
            fase_arg = fase_nombre
            postura_arg = postura_str

        resultado = chat.send_evaluation(
            fase=fase_arg,
            postura=postura_arg,
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

        max_total = len(resultado.puntuaciones) * debate_config.escala_max

        # Limpiar historial efímero
        chat.clear_history()

        return {
            "message": "quick analysis succeeded!",
            "fase": resultado.fase,
            "postura": resultado.postura,
            "orador": resultado.orador,
            "criterios": criterios,
            "total": total,
            "max_total": max_total,
            "debate_type": debate_type_id,
        }

    except HTTPException:
        raise
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
        user_code = payload["user_code"]
        project_code = data.project_code
        
        # Obtener el proyecto
        from app.core.database import projects_table, User
        project = projects_table.get(
            (User.code == project_code) & (User.user_code == user_code)
        )
        
        if not project:
            raise HTTPException(404, "Project not found")
        
        # Obtener los análisis del proyecto
        result = get_project(
            {"user_code": user_code, "project_code": project_code})
        
        return {
            "message": f"here is project {project_code}",
            "project": project,
            "content": result
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"error {e}")
        raise HTTPException(500, f"error {e}")
