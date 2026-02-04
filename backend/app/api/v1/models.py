from pydantic import BaseModel, Field, field_validator
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
