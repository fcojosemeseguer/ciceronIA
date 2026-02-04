from tinydb import TinyDB, Query
from core.security import get_password_hash, verify_password

db = TinyDB('db.json')
users_table = db.table('users')
project_table = db.table('projects')
User = Query()


def create_user(data: dict):
    user = data["user"]
    hashed_pswd = get_password_hash(data["pswd"])
    return users_table.insert({'user': user, 'pswd': hashed_pswd})


def check_user(data: dict) -> bool:
    user = data["user"]
    pswd = data["pswd"]
    result = db.search((User.name == user))
    return verify_password(pswd, result[0]["pswd"])
