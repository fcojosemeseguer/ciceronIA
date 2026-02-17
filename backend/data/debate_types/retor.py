"""
Configuracion del tipo de debate RETOR (Liga de Debate Escolar - Fundacion Activa-t).

Formato dinamico con fases por equipo:
Contextualizacion (6 min), Definicion (2 min), Valoracion (5 min), Conclusion (3 min).
Evaluacion por equipo con 5 bloques (escala 1-5), cada uno con sub-items orientativos.
Se evalua en cada fase de forma parcial y se acumula contexto para la evaluacion global.
"""

from data.debate_types.base import DebateTypeConfig, FaseConfig, CriterioConfig


# --- Fases ---
FASES_RETOR = [
    FaseConfig(
        id="contextualizacion",
        nombre="Contextualizacion",
        descripcion="El equipo debe dejar clara la situacion que existe, vinculandolo con el analisis "
                    "de la mocion y por que su postura es la adecuada. Se articula el contexto y el marco "
                    "sobre el cual reposan los argumentos. Ya es posible refutar el contexto del equipo contrario. "
                    "El primer minuto esta protegido (no se pueden hacer preguntas).",
        tiempo_segundos=360,
        permite_preguntas=True,
        permite_minuto_oro=True,
    ),
    FaseConfig(
        id="definicion",
        nombre="Definicion",
        descripcion="Fase en la que prima la discusion de las definiciones relevantes segun el tema. "
                    "Establece el significado de los conceptos en base al contexto y hechos planteados. "
                    "El equipo especifica los puntos que debe defender y define los conceptos prioritarios. "
                    "El primer minuto esta protegido.",
        tiempo_segundos=120,
        permite_preguntas=True,
        permite_minuto_oro=True,
    ),
    FaseConfig(
        id="valoracion",
        nombre="Valoracion",
        descripcion="El equipo compara sus argumentos con los del equipo contrario, destacando como su "
                    "linea argumental tiene mas valor y refutando los argumentos contrarios. Se reconstruyen "
                    "hechos, definiciones y/o argumentos mal interpretados o danados. "
                    "El primer minuto esta protegido.",
        tiempo_segundos=300,
        permite_preguntas=True,
        permite_minuto_oro=True,
    ),
    FaseConfig(
        id="conclusion",
        nombre="Conclusion",
        descripcion="Cierre del debate. El orador repasa lo sucedido, recuerda los puntos de choque, "
                    "y muestra como su postura ha quedado mas fortalecida. NO se puede introducir "
                    "informacion nueva, NO se puede solicitar minuto de oro, NO se puede dividir entre "
                    "varios oradores, y NO se pueden realizar preguntas.",
        tiempo_segundos=180,
        permite_preguntas=False,
        permite_minuto_oro=False,
        orador_unico=True,
    ),
]

# --- Criterios (5 bloques con sub-items orientativos) ---
CRITERIOS_CONFIG_RETOR = [
    CriterioConfig(
        id="comprension_mocion",
        nombre="Comprension de la Mocion y del Desarrollo del Debate",
        descripcion="Evalua si el equipo comprende la mocion, desarrolla argumentos coherentes "
                    "y conectados entre fases, y cierra sinteticamente.",
        sub_items=[
            "Ajuste a la mocion: Los argumentos son claros, comprensibles y defendidos con razonamientos solidos",
            "Coherencia contextual: El contexto expuesto explica adecuadamente la situacion del debate y justifica por que su postura es necesaria o adecuada",
            "Anticipacion a la refutacion: El equipo demuestra conocer los puntos fuertes del rival y los puntos debiles propios, anticipando criticas o respondiendo a posibles ataques",
            "Desarrollo logico: Los argumentos se presentan de forma ordenada, conectados entre fases (definicion -> contexto -> valoracion)",
            "Cierre sintetico: En la conclusion, el equipo sintetiza los principales acuerdos y desacuerdos del debate sin introducir informacion nueva",
        ],
    ),
    CriterioConfig(
        id="relevancia_informacion",
        nombre="Relevancia de la Informacion Presentada",
        descripcion="Evalua la pertinencia, uso critico y fiabilidad de la informacion y fuentes presentadas.",
        sub_items=[
            "Pertinencia de la informacion: Los datos, ejemplos y argumentos utilizados apoyan directamente la linea argumental del equipo",
            "Uso critico: La informacion no se enumera sin mas: se explica, se conecta con la mocion y se utiliza para refutar o comparar",
            "Fiabilidad de fuentes: El equipo justifica o contextualiza la credibilidad de las fuentes, estudios o ejemplos utilizados",
        ],
    ),
    CriterioConfig(
        id="argumentacion_refutacion",
        nombre="Argumentacion y Refutacion",
        descripcion="Evalua la calidad argumentativa y la capacidad de refutar los argumentos del rival.",
        sub_items=[
            "Calidad argumentativa: Los argumentos son claros, comprensibles y defendidos con razonamientos solidos",
            "Refutacion efectiva: El equipo responde directamente a los argumentos del rival y explica por que su postura es superior",
        ],
    ),
    CriterioConfig(
        id="oratoria_persuasion",
        nombre="Oratoria y Capacidad Persuasiva",
        descripcion="Evalua la claridad expresiva y la capacidad persuasiva del discurso.",
        sub_items=[
            "Claridad expresiva: Mensajes comprensibles, bien estructurados y adaptados al tiempo disponible",
            "Persuasion: El discurso resulta convincente, seguro y coherente con la estrategia del equipo",
        ],
    ),
    CriterioConfig(
        id="trabajo_equipo",
        nombre="Trabajo en Equipo y Uso del Formato RETOR",
        descripcion="Evalua la coordinacion entre miembros del equipo y el uso correcto del formato RETOR.",
        sub_items=[
            "Coordinacion del equipo: Las intervenciones estan conectadas entre si y responden a una estrategia comun",
            "Uso del tiempo RETOR: El equipo gestiona correctamente los tiempos, respeta las fases y utiliza adecuadamente el minuto de oro",
        ],
    ),
]

# En RETOR los criterios son globales (mismos para todas las fases)
# Se evaluan todos los bloques con cada audio de fase, acumulando contexto
CRITERIOS_POR_FASE_RETOR = {
    "contextualizacion": [c.id for c in CRITERIOS_CONFIG_RETOR],
    "definicion": [c.id for c in CRITERIOS_CONFIG_RETOR],
    "valoracion": [c.id for c in CRITERIOS_CONFIG_RETOR],
    "conclusion": [c.id for c in CRITERIOS_CONFIG_RETOR],
}


# --- Configuracion completa ---
RETOR_CONFIG = DebateTypeConfig(
    id="retor",
    nombre="Formato RETOR - Liga de Debate Escolar",
    descripcion="Formato de debate dinamico de la Fundacion Educativa Activa-t. "
                "Evaluacion por equipo con 5 bloques (1-5 puntos). Las intervenciones "
                "vienen determinadas por los tiempos, no por roles fijos. "
                "El equipo gestiona libremente la distribucion de tiempo y oradores.",
    fases=FASES_RETOR,
    posturas=["A Favor", "En Contra"],
    criterios_por_fase=CRITERIOS_POR_FASE_RETOR,
    criterios_config=CRITERIOS_CONFIG_RETOR,
    escala_min=1,
    escala_max=5,
    evaluation_mode="per_team",
    has_final_phase=False,
    final_phase_id=None,
    system_prompt="",   # Se rellena desde prompts.py
    normativa="",       # Se rellena desde prompts.py
    tiempos_por_fase={
        "contextualizacion": 360,
        "definicion": 120,
        "valoracion": 300,
        "conclusion": 180,
    },
)
