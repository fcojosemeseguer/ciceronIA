from tinydb import TinyDB, Query
from app.core.security import get_password_hash, verify_password
from uuid import uuid4
from datetime import datetime, timezone

db = TinyDB('db.json')
users_table = db.table('users')
projects_table = db.table('projects')
analysis_table = db.table('analysis')
teams_table = db.table('teams')
audios_path_table = db.table('audios_path')
audios_transcription_table = db.table('audios_transcription')
audios_metrics_table = db.table('audios_metrics')
project_segments_table = db.table('project_segments')
project_share_links_table = db.table('project_share_links')
User = Query()


def create_user(data: dict):
    try:
        user_name = data["user"]
        user_code = str(uuid4())
        existing_user = users_table.get(User.user == user_name)

        if existing_user:
            print(f"user {user_name} already exists")
            return False

        hashed_pswd = get_password_hash(data["pswd"])

        result = users_table.insert({
            'user': user_name,
            'pswd': hashed_pswd,
            'code': user_code
        })

        return True if result else False

    except Exception as e:
        print(f"unexpected error: {e}")
        return False


def check_user(data: dict) -> bool:
    try:
        user = data["user"]
        pswd = data["pswd"]
        result = users_table.search(User.user == user)
        if not result:
            return False
        return verify_password(pswd, result[0]["pswd"])
    except Exception as e:
        print(f"error {e}")
        return False


def get_user_code(data: dict) -> str:
    user = data["user"]
    result = users_table.search(User.user == user)
    if not result:
        raise ValueError("user not found")
    return result[0]["code"]


def create_project(data: dict):
    try:
        name = data["name"]
        desc = data["desc"]
        user_code = data["user_code"]
        debate_type = data.get("debate_type", "upct")
        team_a_name = data.get("team_a_name", "Equipo A")
        team_b_name = data.get("team_b_name", "Equipo B")
        debate_topic = data.get("debate_topic", "")
        project_code = str(uuid4())
        result = projects_table.insert({
            'name': name,
            'desc': desc,
            'user_code': user_code,
            'code': project_code,
            'debate_type': debate_type,
            'team_a_name': team_a_name,
            'team_b_name': team_b_name,
            'debate_topic': debate_topic
        })
        return project_code if project_code else None
    except Exception as e:
        print(f"unexpected error: {e}")
        return None


def create_analysis(data: dict) -> bool:
    try:
        fase = data["fase"]
        postura = data["postura"]
        orador = data["orador"]
        project_code = data["project_code"]
        criterios = data["criterios"]
        total = data["total"]
        max_total = data["max_total"]
        debate_type = data.get("debate_type", "upct")
        result = analysis_table.insert({
            "project_code": project_code,
            "fase": fase,
            "postura": postura,
            "orador": orador,
            "criterios": criterios,
            "total": total,
            "max_total": max_total,
            "debate_type": debate_type
        })
        return True
    except Exception as e:
        print(f"unexpected error: {e}")
        return False


def get_projects(data: dict):
    try:
        user_code = data["user_code"]
        if user_code:
            return projects_table.search(User.user_code == user_code)
        return []
    except Exception as e:
        print(f"error {e}")
        return []


def get_project(data: dict):
    try:
        user_code = data["user_code"]
        project_code = data["project_code"]
        if user_code is None or project_code is None:
            raise ValueError("missing data")
        project = projects_table.get(
            (User.code == project_code) & (User.user_code == user_code)
        )
        if not project:
            return None
        return analysis_table.search(User.project_code == project_code)
    except Exception as e:
        print(f"error {e}")
        return None


def get_project_by_code(project_code: str):
    try:
        return projects_table.get(User.code == project_code)
    except Exception as e:
        print(f"error {e}")
        return None


def get_project_for_user(user_code: str, project_code: str):
    try:
        return projects_table.get(
            (User.code == project_code) & (User.user_code == user_code)
        )
    except Exception as e:
        print(f"error {e}")
        return None


def get_projects_paginated(
    user_code: str,
    q: str | None = None,
    debate_type: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    try:
        projects = projects_table.search(User.user_code == user_code)
        if q:
            q_low = q.lower()
            projects = [
                p for p in projects
                if q_low in p.get("name", "").lower()
                or q_low in p.get("desc", "").lower()
                or q_low in p.get("debate_topic", "").lower()
            ]
        if debate_type:
            projects = [p for p in projects if p.get("debate_type") == debate_type]
        total = len(projects)
        items = projects[offset: offset + limit]
        return {"items": items, "total": total, "limit": limit, "offset": offset}
    except Exception as e:
        print(f"error {e}")
        return {"items": [], "total": 0, "limit": limit, "offset": offset}


def get_project_debate_type(project_code: str) -> str:
    """
    Obtiene el tipo de debate de un proyecto.
    
    Args:
        project_code: Código del proyecto
    
    Returns:
        ID del tipo de debate (ej: "upct", "retor"). Default "upct" si no está definido.
    """
    try:
        project = projects_table.get(User.code == project_code)
        if project:
            return project.get("debate_type", "upct")
        return "upct"
    except Exception as e:
        print(f"error getting debate type: {e}")
        return "upct"


def create_project_segment(data: dict) -> bool:
    try:
        project_segments_table.insert(data)
        return True
    except Exception as e:
        print(f"unexpected error: {e}")
        return False


def get_project_segments(
    project_code: str,
    fase: str | None = None,
    postura: str | None = None,
    orador: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    try:
        segments = project_segments_table.search(User.project_code == project_code)

        if fase:
            segments = [
                s for s in segments
                if s.get("fase_id") == fase or s.get("fase_nombre") == fase
            ]
        if postura:
            segments = [s for s in segments if s.get("postura") == postura]
        if orador:
            segments = [s for s in segments if s.get("orador") == orador]

        segments.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        total = len(segments)
        items = segments[offset: offset + limit]
        return {"items": items, "total": total, "limit": limit, "offset": offset}
    except Exception as e:
        print(f"error {e}")
        return {"items": [], "total": 0, "limit": limit, "offset": offset}


def build_project_dashboard_summary(segments: list[dict]) -> dict:
    total_segments = len(segments)
    if total_segments == 0:
        return {
            "total_segments": 0,
            "average_score_percent": 0.0,
            "score_by_fase": {},
            "score_by_postura": {},
            "score_by_orador": {},
        }

    score_sum = 0.0
    by_fase = {}
    by_postura = {}
    by_orador = {}

    def _accumulate(bucket: dict, key: str, score_percent: float):
        if key not in bucket:
            bucket[key] = {"avg_score_percent": 0.0, "count": 0}
        bucket[key]["avg_score_percent"] += score_percent
        bucket[key]["count"] += 1

    for segment in segments:
        analysis = segment.get("analysis", {})
        score_percent = float(analysis.get("score_percent", 0.0))
        score_sum += score_percent

        fase_key = segment.get("fase_nombre") or segment.get("fase_id") or "unknown"
        postura_key = segment.get("postura", "unknown")
        orador_key = segment.get("orador", "unknown")

        _accumulate(by_fase, fase_key, score_percent)
        _accumulate(by_postura, postura_key, score_percent)
        _accumulate(by_orador, orador_key, score_percent)

    for bucket in (by_fase, by_postura, by_orador):
        for key, value in bucket.items():
            value["avg_score_percent"] = round(
                value["avg_score_percent"] / value["count"], 2
            )

    return {
        "total_segments": total_segments,
        "average_score_percent": round(score_sum / total_segments, 2),
        "score_by_fase": by_fase,
        "score_by_postura": by_postura,
        "score_by_orador": by_orador,
    }


def create_project_share_link(data: dict) -> bool:
    try:
        project_share_links_table.insert(data)
        return True
    except Exception as e:
        print(f"unexpected error: {e}")
        return False


def list_project_share_links(project_code: str, owner_user_code: str) -> list[dict]:
    try:
        links = project_share_links_table.search(
            (User.project_code == project_code) & (User.owner_user_code == owner_user_code)
        )
        links.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return links
    except Exception as e:
        print(f"error {e}")
        return []


def revoke_project_share_link(project_code: str, owner_user_code: str, share_id: str) -> bool:
    try:
        now = datetime.now(timezone.utc).isoformat()
        updated = project_share_links_table.update(
            {"revoked": True, "revoked_at": now},
            (User.project_code == project_code)
            & (User.owner_user_code == owner_user_code)
            & (User.share_id == share_id),
        )
        return bool(updated)
    except Exception as e:
        print(f"error {e}")
        return False


def get_project_share_link_by_token_hash(token_hash: str):
    try:
        return project_share_links_table.get(User.token_hash == token_hash)
    except Exception as e:
        print(f"error {e}")
        return None


def get_project_chat_human_messages(project_code: str) -> list[str]:
    """
    Devuelve los prompts 'human' guardados en chat_history para un proyecto.
    Se usa como fallback para reconstruir transcripción/métricas en dashboards legacy.
    """
    try:
        chat_history_table = db.table('chat_history')
        session = chat_history_table.get(User.project_id == project_code)
        if not session:
            return []

        messages = session.get("messages", [])
        human_prompts = []
        for msg in messages:
            if msg.get("type") != "human":
                continue
            data = msg.get("data", {})
            content = data.get("content")
            if isinstance(content, str) and content.strip():
                human_prompts.append(content)
        return human_prompts
    except Exception as e:
        print(f"error {e}")
        return []


def get_project_chat_ai_messages(project_code: str) -> list[str]:
    """
    Devuelve las respuestas 'ai' guardadas en chat_history para un proyecto.
    Se usa como fallback para recuperar feedback/recomendaciones en dashboards legacy.
    """
    try:
        chat_history_table = db.table('chat_history')
        session = chat_history_table.get(User.project_id == project_code)
        if not session:
            return []

        messages = session.get("messages", [])
        ai_messages = []
        for msg in messages:
            if msg.get("type") != "ai":
                continue
            data = msg.get("data", {})
            content = data.get("content")
            if isinstance(content, str) and content.strip():
                ai_messages.append(content)
        return ai_messages
    except Exception as e:
        print(f"error {e}")
        return []


def check_team(project_code, team) -> bool:
    try:
        result = teams_table.search(
            User.team == team and User.project_code == project_code)
        return True if result is not None else False
    except Exception as e:
        raise ValueError(e)


def save_audio_path(file_path, project_code, phase, team, speaker, num_speakers):
    try:
        audios_path_table.insert({
            "file_path": file_path,
            "project_code": project_code,
            "phase": phase,
            "team": team,
            "speaker": speaker,
            "num_speakers": num_speakers
        })
    except Exception as e:
        raise Exception(e)


def check_user_existence(user_code) -> bool:
    try:
        return True if users_table.search(User.user_code == user_code) else False
    except Exception as e:
        raise Exception(e)


def get_audio_path(project_code, phase, team):
    try:
        result = audios_path_table.search(
            User.project_code == project_code and User.phase == phase and User.team == team)
        return result[0]
    except Exception as e:
        raise Exception(e)


def save_transcription(file_path, transcript, diarization):
    try:
        audios_transcription_table.insert({
            "file_path": file_path,
            "transcript": transcript,
            "diarization": diarization
        })
    except Exception as e:
        raise Exception(e)


def get_transcription(file_path):
    try:
        result = audios_transcription_table.search(User.file_path == file_path)
        return result[0]["transcript"], result[0]["diarization"]
    except Exception as e:
        raise Exception(e)


def save_metrics(file_path, metrics):
    try:
        audios_metrics_table.insert({
            "file_path": file_path,
            "metrics": metrics
        })
    except Exception as e:
        raise Exception(e)


def get_postura(team):
    try:
        result = teams_table.search(User.team == team)
        return result[0]["postura"]
    except Exception as e:
        raise Exception(e)


def get_orador(file_path):
    try:
        result = audios_path_table.search(User.file_path == file_path)
        return result[0]["speaker"]
    except Exception as e:
        raise Exception(e)


def get_saved_transcription_diarization(file_path):
    try:
        result = audios_transcription_table.search(User.file_path == file_path)
        return result[0]["transcript"], result[0]["diarization"]
    except Exception as e:
        raise Exception(e)


def get_saved_metrics(file_path):
    try:
        result = audios_metrics_table.search(User.file_path == file_path)
        return result[0]["metrics"]
    except Exception as e:
        raise Exception(e)


def create_team(name, desc, postura, project_code):
    try:
        teams_table.insert({
            "name": name,
            "desc": desc,
            "postura": postura,
            "team": str(uuid4()),
            "project_code": project_code
        })
    except Exception as e:
        raise Exception(e)


def get_audio_paths(project_code):
    try:
        return audios_path_table.search(User.project_code == project_code)
    except Exception as e:
        raise Exception(e)


def get_analysis(project_code):
    try:
        results = analysis_table.search(User.project_code == project_code)
        return results
    except Exception as e:
        raise Exception(e)


def get_stats(project_code):
    try:
        analyses = analysis_table.search(User.project_code == project_code)
        audio_paths_raw = audios_path_table.search(
            User.project_code == project_code)

        stats = {
            "global": {
                "total_score": 0,
                "max_possible_score": 0,
                "overall_percentage": 0,
                "total_audios": len(audio_paths_raw)
            },
            "by_phase": {},
            "by_speaker": {}
        }

        for item in analyses:
            phase_name = item.get('fase', 'Unknown')
            speaker_name = item.get('orador', 'Unknown')
            score = item.get('total', 0)
            max_score = item.get('max_total', 1)

            stats["global"]["total_score"] += score
            stats["global"]["max_possible_score"] += max_score

            if phase_name not in stats["by_phase"]:
                stats["by_phase"][phase_name] = {
                    "score": 0,
                    "max_score": 0,
                    "percentage": 0,
                    "criterios": [],
                    "audio_metrics": {},
                    "transcript_preview": ""
                }

            stats["by_phase"][phase_name]["score"] += score
            stats["by_phase"][phase_name]["max_score"] += max_score

            if "criterios" in item:
                stats["by_phase"][phase_name]["criterios"].extend(
                    item["criterios"])

            if speaker_name not in stats["by_speaker"]:
                stats["by_speaker"][speaker_name] = {
                    "total_score": 0,
                    "participations": 0
                }
            stats["by_speaker"][speaker_name]["total_score"] += score
            stats["by_speaker"][speaker_name]["participations"] += 1

        if stats["global"]["max_possible_score"] > 0:
            stats["global"]["overall_percentage"] = round(
                (stats["global"]["total_score"] /
                 stats["global"]["max_possible_score"]) * 100, 2
            )

        for audio in audio_paths_raw:
            file_path = audio['file_path']
            phase_name = audio.get('phase', 'Unknown')

            metrics_result = audios_metrics_table.search(
                User.file_path == file_path)
            transcript_result = audios_transcription_table.search(
                User.file_path == file_path)

            if phase_name not in stats["by_phase"]:
                stats["by_phase"][phase_name] = {
                    "score": 0, "max_score": 0, "percentage": 0, "criterios": [],
                    "audio_metrics": {}, "transcript_preview": ""
                }

            if metrics_result:
                stats["by_phase"][phase_name]["audio_metrics"] = metrics_result[0].get(
                    "metrics", {})

            if transcript_result:
                full_text = transcript_result[0].get("transcript", "")
                stats["by_phase"][phase_name]["transcript_preview"] = full_text[:100] + \
                    "..." if len(full_text) > 100 else full_text

        for phase, data in stats["by_phase"].items():
            if data["max_score"] > 0:
                data["percentage"] = round(
                    (data["score"] / data["max_score"]) * 100, 2)

        return stats

    except Exception as e:
        raise Exception(e)
