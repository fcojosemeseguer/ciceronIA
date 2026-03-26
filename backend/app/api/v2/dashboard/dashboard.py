from itertools import groupby
from app.core.database import get_project_segments


def get_transcription_formatted(transcript):
    formatted = "\n\n".join(
        f"{speaker}: {' '.join(seg.get('text', '').strip() for seg in group if seg.get('text'))}"
        for speaker, group in groupby(transcript, key=lambda seg: seg.get("speaker", "UNKNOWN"))
    ).strip()
    return formatted


def get_scores_formatted(analysis):
    return (analysis or {}).get("criterios", [])


def get_metrics_transcription_scores_formatted(project_code):
    """Gets all segment info linked to a project for the dashboard"""
    records = get_project_segments(
        project_code, limit=100000, offset=0)["items"]
    output = {}
    for r in records:
        file_path = r.get("file_path")
        if not file_path:
            continue

        output[file_path] = {
            "phase": r.get("fase_nombre") or r.get("fase_id"),
            "team": r.get("postura"),
            "speaker": r.get("orador"),
        }

        metrics = r.get("metrics_raw") or r.get("metrics_summary") or {}
        output[file_path]["metrics"] = next(iter(metrics.values()), {})

        trans = get_transcription_formatted(r.get("transcript") or [])
        output[file_path]["transcription"] = trans

        scores = get_scores_formatted(r.get("analysis"))
        output[file_path]["scores"] = scores
    return output
