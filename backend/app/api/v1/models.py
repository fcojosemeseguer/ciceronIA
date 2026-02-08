from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from fastapi import UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, ConfigDict
from fastapi import UploadFile, File, Form, Depends
import re


class CredsInput(BaseModel):
    user: str = Field(..., min_length=3, max_length=20)
    pswd: str = Field(..., min_length=8, max_length=32)

    @field_validator('user')
    @classmethod
    def validate_user(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError(
                'El usuario solo permite letras, números y guiones bajos')
        return v

    @field_validator('pswd')
    @classmethod
    def validate_password_complexity(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError(
                'La contraseña solo permite letras, números y guiones bajos')

        if not re.search(r'[a-zA-Z]', v):
            raise ValueError('La contraseña debe incluir al menos una letra')

        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe incluir al menos un número')

        return v


class NewProjectInfo(BaseModel):
    name: str = Field(..., min_length=1, max_length=32)
    description: str = Field(..., min_length=0, max_length=128)
    jwt: str = Field(...)


class AnalyseData(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    fase: str = Field(..., min_length=1, max_length=32)
    postura: str = Field(..., min_length=1, max_length=16)
    orador: str = Field(...)
    num_speakers: int = Field(...)
    jwt: str = Field(...)
    project_code: str = Field(...)
    file: UploadFile

    @field_validator('file')
    @classmethod
    def validate_wav(cls, v: UploadFile) -> UploadFile:
        if not v.filename.lower().endswith('.wav'):
            raise ValueError('El archivo debe tener extensión .wav')

        valid_mime_types = ['audio/wav', 'audio/x-wav', 'audio/wave']
        if v.content_type not in valid_mime_types:
            raise ValueError(
                f'Tipo de archivo no permitido: {v.content_type}. Debe ser audio/wav.')

        return v

    @classmethod
    def as_form(
        cls,
        fase: str = Form(...),
        postura: str = Form(...),
        orador: str = Form(...),
        num_speakers: int = Form(...),
        jwt: str = Form(...),
        project_code: str = Form(...),
        file: UploadFile = File(...)
    ) -> "AnalyseData":
        return cls(
            fase=fase,
            postura=postura,
            orador=orador,
            num_speakers=num_speakers,
            jwt=jwt,
            project_code=project_code,
            file=file
        )


class AuthData(BaseModel):
    jwt: str = Field(...)


class AuthDataProject(BaseModel):
    jwt: str = Field(...)
    project_code: str = Field(...)
