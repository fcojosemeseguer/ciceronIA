import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from app.core.database import (
    create_analysis,
    create_project_segment,
    save_metrics,
    save_transcription,
)
from app.processors.pipeline import DebateFase, Postura, create_chat
from app.services.metrics import process_complete_analysis


chats: dict[str, object] = {}
ANALYSIS_PIPELINE_LOCK = asyncio.Lock()

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


def get_chat(project_code):
    return chats.get(project_code)


def build_metrics_summary(metrics: dict) -> dict:
    summary = {}
    for speaker, speaker_metrics in metrics.items():
        summary[speaker] = {
            metric_name: speaker_metrics.get(metric_name)
            for metric_name in KEY_METRICS_NAMES
            if metric_name in speaker_metrics
        }
    return summary


def build_transcript_preview(transcription: list[dict], max_len: int = 280) -> str:
    full_text = " ".join(seg.get("text", "") for seg in transcription).strip()
    if len(full_text) <= max_len:
        return full_text
    return full_text[:max_len].rstrip() + "..."


def persist_analysis_artifacts(
    file_path: str,
    transcription: list[dict],
    metrics: dict,
) -> None:
    save_transcription(file_path, transcription, "")
    save_metrics(file_path, metrics)


def run_project_analysis(
    *,
    project: dict,
    user_code: str,
    debate_type_id: str,
    debate_config,
    fase_cfg,
    postura_str: str,
    orador: str,
    num_speakers: int,
    file_path: str,
) -> dict:
    if chats.get(project["code"]) is None:
        chats[project["code"]] = create_chat(
            project["code"],
            project["code"],
            debate_type_config=debate_config,
        )
    chat = chats[project["code"]]

    analysis_data = process_complete_analysis(file_path, num_speakers)
    transcription = analysis_data["transcript"]
    metrics = analysis_data["metrics"]

    persist_analysis_artifacts(file_path, transcription, metrics)

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
        fase_arg,
        postura_arg,
        orador,
        transcription,
        metrics,
        duracion,
    )

    criterios = []
    total = 0
    for criterio, nota in resultado.puntuaciones.items():
        anotacion = resultado.anotaciones.get(criterio, "")
        criterios.append(
            {"criterio": criterio, "nota": nota, "anotacion": anotacion}
        )
        total += nota

    max_total = len(resultado.puntuaciones) * debate_config.escala_max
    score_percent = round((total / max_total) * 100, 2) if max_total > 0 else 0.0

    legacy_saved = create_analysis(
        {
            "fase": resultado.fase,
            "postura": resultado.postura,
            "orador": resultado.orador,
            "criterios": criterios,
            "total": total,
            "max_total": max_total,
            "project_code": project["code"],
            "debate_type": debate_type_id,
        },
    )
    if not legacy_saved:
        raise RuntimeError("error while saving legacy analysis")

    segment_id = str(uuid4())
    segment_payload = {
        "segment_id": segment_id,
        "project_code": project["code"],
        "user_code": user_code,
        "file_path": file_path,
        "debate_type": debate_type_id,
        "fase_id": fase_cfg.id,
        "fase_nombre": fase_cfg.nombre,
        "postura": postura_str,
        "orador": orador,
        "num_speakers": num_speakers,
        "duration_seconds": duracion,
        "transcript": transcription,
        "transcript_preview": build_transcript_preview(transcription),
        "metrics_summary": build_metrics_summary(metrics),
        "metrics_raw": metrics,
        "analysis": {
            "criterios": criterios,
            "total": total,
            "max_total": max_total,
            "score_percent": score_percent,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    segment_saved = create_project_segment(segment_payload)
    if not segment_saved:
        raise RuntimeError("error while saving project segment")

    return {
        "segment_id": segment_id,
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
        "transcript_preview": segment_payload["transcript_preview"],
    }
