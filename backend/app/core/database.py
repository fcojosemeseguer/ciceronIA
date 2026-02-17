from tinydb import TinyDB, Query
from app.core.security import get_password_hash, verify_password
from uuid import uuid4

db = TinyDB('db.json')
users_table = db.table('users')
projects_table = db.table('projects')
analysis_table = db.table('analysis')
teams_table = db.table('teams')
audios_path_table = db.table('audios_path')
audios_transcription_table = db.table('audios_transcription')
audios_metrics_table = db.table('audios_metrics')
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
        project_code = str(uuid4())
        result = projects_table.insert({
            'name': name,
            'desc': desc,
            'user_code': user_code,
            'code': project_code,
            'debate_type': debate_type
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
