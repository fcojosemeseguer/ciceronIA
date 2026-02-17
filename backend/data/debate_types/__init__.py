"""
Registro central de tipos de debate.

Importa y registra todas las configuraciones de tipos de debate disponibles.
Para anadir un nuevo tipo de debate:
1. Crear un archivo en data/debate_types/ con la configuracion
2. Importar y registrar aqui en DEBATE_TYPES
"""

from data.debate_types.base import DebateTypeConfig
from data.debate_types.upct import UPCT_CONFIG
from data.debate_types.retor import RETOR_CONFIG
from data.prompts.prompts import (
    system_prompt_evaluation as upct_system_prompt,
    normativa_fases_upct,
    system_prompt_retor,
    normativa_retor,
)

# Asignar prompts a cada configuracion
UPCT_CONFIG.system_prompt = upct_system_prompt
UPCT_CONFIG.normativa = normativa_fases_upct

RETOR_CONFIG.system_prompt = system_prompt_retor
RETOR_CONFIG.normativa = normativa_retor

# Registro de tipos de debate: id -> config
DEBATE_TYPES: dict[str, DebateTypeConfig] = {
    "upct": UPCT_CONFIG,
    "retor": RETOR_CONFIG,
}

DEFAULT_DEBATE_TYPE = "upct"


def get_debate_type(debate_type_id: str) -> DebateTypeConfig:
    """
    Obtiene la configuracion de un tipo de debate por su ID.
    
    Args:
        debate_type_id: ID del tipo de debate (ej: "upct", "retor")
    
    Returns:
        DebateTypeConfig con la configuracion completa
    
    Raises:
        ValueError si el tipo no existe
    """
    config = DEBATE_TYPES.get(debate_type_id)
    if config is None:
        available = ", ".join(DEBATE_TYPES.keys())
        raise ValueError(
            f"Tipo de debate '{debate_type_id}' no encontrado. "
            f"Tipos disponibles: {available}"
        )
    return config


def list_debate_types() -> list[dict]:
    """
    Lista todos los tipos de debate disponibles con info resumida.
    
    Returns:
        Lista de dicts con id, nombre, descripcion, fases, escala, modo
    """
    result = []
    for dt_id, config in DEBATE_TYPES.items():
        result.append({
            "id": config.id,
            "nombre": config.nombre,
            "descripcion": config.descripcion,
            "fases": [{"id": f.id, "nombre": f.nombre, "tiempo_segundos": f.tiempo_segundos} for f in config.fases],
            "posturas": config.posturas,
            "escala_min": config.escala_min,
            "escala_max": config.escala_max,
            "evaluation_mode": config.evaluation_mode,
            "criterios": [{"id": c.id, "nombre": c.nombre, "descripcion": c.descripcion} for c in config.criterios_config],
        })
    return result
