from typing import Literal, Optional

from fastapi import File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


def _raise_form_validation_error(exc: ValidationError) -> None:
    detail = [
        {
            "loc": ["body", *error.get("loc", [])],
            "msg": error.get("msg", "invalid input"),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()
    ]
    raise HTTPException(status_code=422, detail=detail) from exc


class ResourceListQuery(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    fase: Optional[str] = Field(default=None, max_length=64)
    postura: Optional[str] = Field(default=None, max_length=32)
    orador: Optional[str] = Field(default=None, max_length=128)
    include_transcript: bool = Field(default=False)
    include_metrics: bool = Field(default=False)


class AnalysisJobCreateData(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    fase: str = Field(..., min_length=1, max_length=32)
    postura: str = Field(..., min_length=1, max_length=16)
    orador: str = Field(...)
    num_speakers: int = Field(..., ge=1, le=20)
    file: UploadFile

    @field_validator("file")
    @classmethod
    def validate_wav(cls, v: UploadFile) -> UploadFile:
        if not v.filename.lower().endswith(".wav"):
            raise ValueError("El archivo debe tener extensión .wav")

        valid_mime_types = ["audio/wav", "audio/x-wav", "audio/wave"]
        if v.content_type not in valid_mime_types:
            raise ValueError(
                f"Tipo de archivo no permitido: {v.content_type}. Debe ser audio/wav."
            )

        return v

    @classmethod
    def as_form(
        cls,
        fase: str = Form(...),
        postura: str = Form(...),
        orador: str = Form(...),
        num_speakers: int = Form(...),
        file: UploadFile = File(...),
    ) -> "AnalysisJobCreateData":
        try:
            return cls(
                fase=fase,
                postura=postura,
                orador=orador,
                num_speakers=num_speakers,
                file=file,
            )
        except ValidationError as exc:
            _raise_form_validation_error(exc)


class AnalysisJobStatusResponse(BaseModel):
    job_id: str
    project_code: str
    status: Literal["queued", "running", "succeeded", "failed"]
    created_at: str
    updated_at: str
    submitted_by: str
    fase: str
    postura: str
    orador: str
    num_speakers: int
    segment_id: Optional[str] = None
    error: Optional[str] = None
    result: Optional[dict] = None
