from datetime import datetime
from typing import Optional

from fastapi import File, Form, UploadFile
from pydantic import BaseModel, ConfigDict, Field, field_validator
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
    jwt: Optional[str] = Field(default=None)
    debate_type: str = Field(default="upct", min_length=1, max_length=32)
    team_a_name: str = Field(default="Equipo A", min_length=1, max_length=64)
    team_b_name: str = Field(default="Equipo B", min_length=1, max_length=64)
    debate_topic: str = Field(default="", min_length=0, max_length=256)


class AnalyseData(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    fase: str = Field(..., min_length=1, max_length=32)
    postura: str = Field(..., min_length=1, max_length=16)
    orador: str = Field(...)
    num_speakers: int = Field(...)
    jwt: Optional[str] = Field(default=None)
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
        jwt: Optional[str] = Form(default=None),
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
    jwt: Optional[str] = Field(default=None)


class AuthDataProject(BaseModel):
    jwt: Optional[str] = Field(default=None)
    project_code: str = Field(...)
    include_segments: bool = Field(default=False)
    include_transcript: bool = Field(default=False)
    include_metrics: bool = Field(default=False)
    fase: Optional[str] = Field(default=None, max_length=64)
    postura: Optional[str] = Field(default=None, max_length=32)
    orador: Optional[str] = Field(default=None, max_length=128)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class AuthDataProjects(BaseModel):
    jwt: Optional[str] = Field(default=None)
    q: Optional[str] = Field(default=None, max_length=128)
    debate_type: Optional[str] = Field(default=None, max_length=32)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class QuickAnalyseData(BaseModel):
    """Datos para análisis rápido sin proyecto asociado."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    fase: str = Field(..., min_length=1, max_length=32)
    postura: str = Field(..., min_length=1, max_length=16)
    orador: str = Field(...)
    num_speakers: int = Field(...)
    jwt: Optional[str] = Field(default=None)
    debate_type: str = Field(default="upct", min_length=1, max_length=32)
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
        jwt: Optional[str] = Form(default=None),
        debate_type: str = Form(default="upct"),
        file: UploadFile = File(...)
    ) -> "QuickAnalyseData":
        return cls(
            fase=fase,
            postura=postura,
            orador=orador,
            num_speakers=num_speakers,
            jwt=jwt,
            debate_type=debate_type,
            file=file
        )


class ShareLinkCreateData(BaseModel):
    jwt: Optional[str] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    allow_full_transcript: bool = Field(default=False)
    allow_raw_metrics: bool = Field(default=False)


class DashBoardData(BaseModel):
    jwt: str = Field(default=None)
    project_code: str = Field(default=None)


class InstantChatData(BaseModel):
    jwt: str = Field(default=None)
    project_code: str = Field(default=None)
    message: str = Field(default=None)
