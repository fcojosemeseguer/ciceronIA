import os


def del_audios(paths: list):
    try:
        for path in paths:
            os.remove(path)
    except Exception as e:
        raise Exception(e)
