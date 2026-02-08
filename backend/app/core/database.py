from tinydb import TinyDB, Query
from app.core.security import get_password_hash, verify_password
from uuid import uuid4

db = TinyDB('db.json')
users_table = db.table('users')
projects_table = db.table('projects')
analysis_table = db.table('analysis')
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
        project_code = str(uuid4())
        result = projects_table.insert({
            'name': name,
            'desc': desc,
            'user_code': user_code,
            'code': project_code
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
        result = analysis_table.insert({
            "project_code": project_code,
            "fase": fase,
            "postura": postura,
            "orador": orador,
            "criterios": criterios,
            "total": total,
            "max_total": max_total
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
