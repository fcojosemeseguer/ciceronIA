"""
Configuracion del tipo de debate DEMO.

Formato corto para demostraciones:
Introduccion (40s), Argumentos (40s), Conclusion (30s).
Evaluacion individual por intervencion, escala 0-4.
"""

from data.debate_types.base import DebateTypeConfig, FaseConfig, CriterioConfig


FASES_DEMO = [
    FaseConfig(
        id="introduccion",
        nombre="Introduccion",
        descripcion="Apertura breve: presenta postura, marco y linea principal.",
        tiempo_segundos=40,
        permite_preguntas=False,
    ),
    FaseConfig(
        id="argumentos",
        nombre="Argumentos",
        descripcion="Desarrollo breve de los argumentos principales y respuesta a la postura rival.",
        tiempo_segundos=40,
        permite_preguntas=False,
    ),
    FaseConfig(
        id="conclusion",
        nombre="Conclusion",
        descripcion="Cierre sintetico sin informacion nueva, reforzando la tesis y los puntos clave.",
        tiempo_segundos=30,
        permite_preguntas=False,
    ),
]


CRITERIOS_POR_FASE_DEMO = {
    "introduccion": [
        "claridad_tesis",
        "estructura_inicial",
        "atraccion_inicio",
        "comunicacion_oral",
        "ajuste_tiempo",
    ],
    "argumentos": [
        "solidez_argumental",
        "uso_evidencias",
        "respuesta_rival",
        "comunicacion_oral",
        "ajuste_tiempo",
    ],
    "conclusion": [
        "sintesis",
        "reivindicacion_postura",
        "impacto_cierre",
        "comunicacion_oral",
        "ajuste_tiempo",
    ],
}


CRITERIOS_CONFIG_DEMO = [
    CriterioConfig(
        id="claridad_tesis",
        nombre="Claridad de tesis",
        descripcion="La postura queda clara desde el inicio y se entiende que quiere defender el equipo.",
    ),
    CriterioConfig(
        id="estructura_inicial",
        nombre="Estructura inicial",
        descripcion="Ordena la apertura con una idea principal y transiciones comprensibles.",
    ),
    CriterioConfig(
        id="atraccion_inicio",
        nombre="Inicio llamativo",
        descripcion="Capta la atencion con una entrada pertinente y conectada con el tema.",
    ),
    CriterioConfig(
        id="solidez_argumental",
        nombre="Solidez argumental",
        descripcion="Los argumentos son logicos, relevantes y apoyan la tesis.",
    ),
    CriterioConfig(
        id="uso_evidencias",
        nombre="Uso de evidencias",
        descripcion="Usa ejemplos, datos o razones concretas para sostener los argumentos.",
    ),
    CriterioConfig(
        id="respuesta_rival",
        nombre="Respuesta a la postura rival",
        descripcion="Anticipa, responde o debilita puntos relevantes del equipo contrario.",
    ),
    CriterioConfig(
        id="sintesis",
        nombre="Sintesis",
        descripcion="Resume los puntos mas importantes sin anadir informacion nueva.",
    ),
    CriterioConfig(
        id="reivindicacion_postura",
        nombre="Reivindicacion de postura",
        descripcion="Refuerza por que su postura debe prevalecer al cierre del debate.",
    ),
    CriterioConfig(
        id="impacto_cierre",
        nombre="Impacto del cierre",
        descripcion="Cierra con fuerza, coherencia y sensacion de conclusion.",
    ),
    CriterioConfig(
        id="comunicacion_oral",
        nombre="Comunicacion oral",
        descripcion="Voz, ritmo, claridad, seguridad y capacidad persuasiva.",
    ),
    CriterioConfig(
        id="ajuste_tiempo",
        nombre="Ajuste al tiempo",
        descripcion="Respeta el tiempo asignado y distribuye bien la intervencion.",
    ),
]


DEMO_CONFIG = DebateTypeConfig(
    id="demo",
    nombre="Demo 40/40/30",
    descripcion="Formato corto para demo: Introduccion 40s, Argumentos 40s y Conclusion 30s.",
    fases=FASES_DEMO,
    posturas=["A Favor", "En Contra"],
    criterios_por_fase=CRITERIOS_POR_FASE_DEMO,
    criterios_config=CRITERIOS_CONFIG_DEMO,
    escala_min=0,
    escala_max=4,
    evaluation_mode="per_speaker",
    has_final_phase=False,
    final_phase_id=None,
    system_prompt="",
    normativa="",
    tiempos_por_fase={
        "introduccion": 40,
        "argumentos": 40,
        "conclusion": 30,
    },
)
