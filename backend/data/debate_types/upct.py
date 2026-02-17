"""
Configuracion del tipo de debate UPCT (I Torneo de Debate UPCT).

Formato academico clasico con fases por orador individual:
Introduccion, Refutacion 1, Refutacion 2, Conclusion, Final.
Evaluacion individual por orador en cada fase, escala 0-4.
"""

from data.debate_types.base import DebateTypeConfig, FaseConfig, CriterioConfig


# --- Fases ---
FASES_UPCT = [
    FaseConfig(
        id="introduccion",
        nombre="Introduccion",
        descripcion="Presentacion inicial del equipo. Se expone el statu quo, definiciones y linea argumental.",
        tiempo_segundos=0,
        permite_preguntas=True,
    ),
    FaseConfig(
        id="refutacion_1",
        nombre="Refutacion 1",
        descripcion="Desarrollo de linea argumental, refutacion y defensa de argumentos.",
        tiempo_segundos=0,
        permite_preguntas=True,
    ),
    FaseConfig(
        id="refutacion_2",
        nombre="Refutacion 2",
        descripcion="Refutacion de puntos de choque y reconstruccion de linea argumental.",
        tiempo_segundos=0,
        permite_preguntas=True,
    ),
    FaseConfig(
        id="conclusion",
        nombre="Conclusion",
        descripcion="Resumen sin informacion nueva, puntos de acogida y choque, reivindicacion de postura.",
        tiempo_segundos=0,
        permite_preguntas=False,
    ),
    FaseConfig(
        id="final",
        nombre="Final",
        descripcion="Evaluacion final del equipo: sumatorio de oradores, conexion del equipo y mejor orador.",
        tiempo_segundos=0,
        permite_preguntas=False,
    ),
]

# --- Criterios por fase ---
CRITERIOS_POR_FASE_UPCT = {
    "introduccion": [
        "introduccion_llamativa",
        "statu_quo_definiciones",
        "linea_argumental",
        "pertinencia_preguntas",
        "verosimilitud_evidencias",
        "razonamiento_argumentacion",
        "comprension_premisa_contraria",
        "comunicacion_eficacia_liderazgo",
        "uso_riqueza_lenguaje",
        "ajuste_tiempo"
    ],
    "refutacion_1": [
        "introduccion_llamativa",
        "linea_argumental_solucion",
        "refutacion_defensa",
        "pertinencia_preguntas",
        "verosimilitud_evidencias",
        "razonamiento_argumentacion",
        "comprension_argumentos_oponentes",
        "comunicacion_eficacia_liderazgo",
        "uso_riqueza_lenguaje",
        "ajuste_tiempo"
    ],
    "refutacion_2": [
        "introduccion_llamativa",
        "refutacion_puntos_choque",
        "reconstruccion_linea_argumental",
        "pertinencia_preguntas",
        "verosimilitud_evidencias",
        "razonamiento_argumentacion",
        "comprension_argumentos_oponentes",
        "comunicacion_eficacia_liderazgo",
        "uso_riqueza_lenguaje",
        "ajuste_tiempo"
    ],
    "conclusion": [
        "introduccion_llamativa",
        "resumen_sin_info_nueva",
        "puntos_acogida_choque",
        "reivindicacion_postura",
        "explicacion_exordio",
        "razonamiento_argumentacion",
        "comprension_argumentos_oponentes",
        "comunicacion_eficacia_liderazgo",
        "uso_riqueza_lenguaje",
        "ajuste_tiempo"
    ],
    "final": [
        "sumatorio_oradores",
        "estructuracion_conexion_equipo",
        "mejor_orador"
    ]
}

# --- Criterios config (descripcion de cada criterio) ---
CRITERIOS_CONFIG_UPCT = [
    CriterioConfig(id="introduccion_llamativa", nombre="Introduccion llamativa",
                   descripcion="Introduce de forma llamativa y cierra correctamente."),
    CriterioConfig(id="statu_quo_definiciones", nombre="Statu quo y definiciones",
                   descripcion="Presenta el statu quo y definiciones pertinentes."),
    CriterioConfig(id="linea_argumental", nombre="Linea argumental",
                   descripcion="Presenta/desarrolla la linea argumental y/o solucion innovadora."),
    CriterioConfig(id="pertinencia_preguntas", nombre="Pertinencia preguntas",
                   descripcion="Pertinencia de preguntas/respuestas. Regla especial: 0 si no concede habiendo oportunidad; 4 si el rival no pregunta."),
    CriterioConfig(id="verosimilitud_evidencias", nombre="Verosimilitud evidencias",
                   descripcion="Habilidad critica/creativa en la verosimilitud de evidencias."),
    CriterioConfig(id="razonamiento_argumentacion", nombre="Razonamiento y argumentacion",
                   descripcion="Habilidad de razonamiento y argumentacion."),
    CriterioConfig(id="comprension_premisa_contraria", nombre="Comprension premisa contraria",
                   descripcion="Comprension de premisa contraria (refuta o adelanta refutacion)."),
    CriterioConfig(id="comunicacion_eficacia_liderazgo", nombre="Comunicacion eficacia y liderazgo",
                   descripcion="Comunicacion con eficacia y liderazgo (Voz, No verbal)."),
    CriterioConfig(id="uso_riqueza_lenguaje", nombre="Uso y riqueza del lenguaje",
                   descripcion="Uso y riqueza del lenguaje."),
    CriterioConfig(id="ajuste_tiempo", nombre="Ajuste al tiempo",
                   descripcion="Ajuste al tiempo. Penalizacion: si sobra >20s o falta >10s."),
    CriterioConfig(id="linea_argumental_solucion", nombre="Linea argumental y solucion",
                   descripcion="Desarrolla linea argumental y solucion innovadora."),
    CriterioConfig(id="refutacion_defensa", nombre="Refutacion y defensa",
                   descripcion="Refuta/Adelanta refutacion y se defiende."),
    CriterioConfig(id="comprension_argumentos_oponentes", nombre="Comprension argumentos oponentes",
                   descripcion="Comprension de argumentos oponentes."),
    CriterioConfig(id="refutacion_puntos_choque", nombre="Refutacion puntos de choque",
                   descripcion="Refuta y se defiende justificando los PUNTOS DE CHOQUE."),
    CriterioConfig(id="reconstruccion_linea_argumental", nombre="Reconstruccion linea argumental",
                   descripcion="Reconstruye la linea argumental o solucion propuesta."),
    CriterioConfig(id="resumen_sin_info_nueva", nombre="Resumen sin info nueva",
                   descripcion="Resume SIN ANADIR informacion nueva."),
    CriterioConfig(id="puntos_acogida_choque", nombre="Puntos acogida y choque",
                   descripcion="Justifica puntos de acogida y choque con su linea/solucion."),
    CriterioConfig(id="reivindicacion_postura", nombre="Reivindicacion postura",
                   descripcion="Reivindicacion de postura propia (enfasis en tesis)."),
    CriterioConfig(id="explicacion_exordio", nombre="Explicacion exordio",
                   descripcion="Explicacion del exordio/frase usados por el equipo."),
    CriterioConfig(id="sumatorio_oradores", nombre="Sumatorio oradores",
                   descripcion="Sumatorio de oradores anteriores."),
    CriterioConfig(id="estructuracion_conexion_equipo", nombre="Estructuracion conexion equipo",
                   descripcion="Estructuracion y habilidad de conexion del discurso entre los miembros del equipo (0-4 puntos)."),
    CriterioConfig(id="mejor_orador", nombre="Mejor orador",
                   descripcion="Seleccion del MEJOR ORADOR."),
]


# --- Configuracion completa ---
UPCT_CONFIG = DebateTypeConfig(
    id="upct",
    nombre="I Torneo de Debate UPCT",
    descripcion="Formato academico del I Torneo de Debate de la Universidad Politecnica de Cartagena. "
                "Evaluacion individual por orador en cada fase con escala 0-4 puntos.",
    fases=FASES_UPCT,
    posturas=["A Favor", "En Contra"],
    criterios_por_fase=CRITERIOS_POR_FASE_UPCT,
    criterios_config=CRITERIOS_CONFIG_UPCT,
    escala_min=0,
    escala_max=4,
    evaluation_mode="per_speaker",
    has_final_phase=True,
    final_phase_id="final",
    system_prompt="",   # Se rellena desde prompts.py
    normativa="",       # Se rellena desde prompts.py
    tiempos_por_fase={},
)
