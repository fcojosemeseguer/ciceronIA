from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import HumanMessage, AIMessage
import os
from dotenv import load_dotenv

from app.services.ai_engine import TinyDBChatMessageHistory
from data.prompts.prompts import system_prompt_evaluation
from data.debate_types.base import DebateTypeConfig
from data.debate_types import get_debate_type, DEFAULT_DEBATE_TYPE

load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OpenAI key not found")


# ---------------------------------------------------------------------------
# Backward-compatible enums (used by UPCT flow and endpoints)
# ---------------------------------------------------------------------------

class DebateFase(str, Enum):
    """Fases válidas de un debate según normativa UPCT."""
    INTRO = "Introducción"
    REF1 = "Refutación 1"
    REF2 = "Refutación 2"
    CONCLUSION = "Conclusión"
    FINAL = "Final"


class Postura(str, Enum):
    """Postura del equipo en el debate."""
    FAVOR = "A Favor"
    CONTRA = "En Contra"


# Backward-compatible dict (still used by legacy UPCT callers)
CRITERIOS_POR_FASE = {
    DebateFase.INTRO: [
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
    DebateFase.REF1: [
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
    DebateFase.REF2: [
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
    DebateFase.CONCLUSION: [
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
    DebateFase.FINAL: [
        "sumatorio_oradores",
        "estructuracion_conexion_equipo",
        "mejor_orador"
    ]
}

# Métricas clave para el análisis paralingüístico
KEY_METRICS = [
    "F0semitoneFrom27.5Hz_sma3nz_stddevNorm",  # Expresividad
    "loudness_sma3_amean",                     # Proyección
    "loudness_sma3_stddevNorm",                # Énfasis
    "loudnessPeaksPerSec",                     # Velocidad
    "VoicedSegmentsPerSec",                    # Ritmo
    "MeanUnvoicedSegmentLength",               # Silencios
    "jitterLocal_sma3nz_amean",                # Seguridad (Jitter)
    "shimmerLocaldB_sma3nz_amean"              # Seguridad (Shimmer)
]


# ---------------------------------------------------------------------------
# Pydantic output models
# ---------------------------------------------------------------------------

class EvaluationResult(BaseModel):
    """Resultado estructurado de una evaluación de debate (genérico)."""
    puntuaciones: dict[str, int] = Field(
        description="Diccionario con criterio como clave y puntuación como valor"
    )
    anotaciones: dict[str, str] = Field(
        description="Diccionario con criterio como clave y sugerencia breve de mejora como valor"
    )
    fase: str = Field(description="Fase del debate evaluada")
    postura: str = Field(description="Postura del equipo: A Favor o En Contra")
    orador: str = Field(description="Identificador del orador evaluado")
    debate_type: str = Field(default="upct", description="Tipo de debate")


class EvaluationOutput(BaseModel):
    """Modelo para parsear la respuesta del LLM - evaluación UPCT por orador."""
    puntuaciones: dict[str, int] = Field(
        description="Puntuaciones por criterio (0-4). Las claves deben coincidir con los criterios de la fase."
    )
    anotaciones: dict[str, str] = Field(
        description="Breve sugerencia de mejora (máx 15 palabras) por cada criterio. Mismas claves que puntuaciones."
    )
    feedback: str = Field(
        description="Feedback constructivo general para el orador (2-3 frases)"
    )


class FinalEvaluationOutput(BaseModel):
    """Modelo para parsear la respuesta del LLM en fase Final (UPCT)."""
    puntuaciones: dict[str, int] = Field(
        description="Incluye sumatorio_oradores, estructuracion_conexion_equipo"
    )
    anotaciones: dict[str, str] = Field(
        description="Breve sugerencia de mejora por criterio evaluado del equipo"
    )
    mejor_orador: str = Field(
        description="Nombre/identificador del mejor orador del equipo"
    )
    justificacion_mejor_orador: str = Field(
        description="Justificación de la selección del mejor orador"
    )
    feedback_equipo: str = Field(
        description="Feedback general para el equipo"
    )


class RetorEvaluationOutput(BaseModel):
    """Modelo para parsear la respuesta del LLM - evaluación RETOR por equipo."""
    puntuaciones: dict[str, int] = Field(
        description="Puntuaciones por bloque (1-5). Claves: comprension_mocion, relevancia_informacion, "
                    "argumentacion_refutacion, oratoria_persuasion, trabajo_equipo."
    )
    anotaciones: dict[str, str] = Field(
        description="Breve anotación orientativa (máx 20 palabras) por cada bloque. Mismas claves que puntuaciones."
    )
    feedback: str = Field(
        description="Feedback constructivo general para el equipo en esta fase (2-3 frases)"
    )


# ---------------------------------------------------------------------------
# ChatSession - now config-driven
# ---------------------------------------------------------------------------

class ChatSession:
    """
    Sesión de chat para evaluar debates.

    Mantiene el historial de conversación y permite enviar evaluaciones
    estructuradas al LLM juez de debate. Soporta múltiples tipos de debate
    a través de DebateTypeConfig.
    """

    def __init__(
        self,
        project_id: str,
        session_id: str,
        db_path: str = "db.json",
        debate_type_config: Optional[DebateTypeConfig] = None,
    ):
        self.project_id = project_id
        self.session_id = session_id
        self.db_path = db_path

        # Si no se pasa config, usar UPCT por defecto (retrocompatibilidad)
        if debate_type_config is not None:
            self.config = debate_type_config
        else:
            self.config = get_debate_type(DEFAULT_DEBATE_TYPE)

        self._history = TinyDBChatMessageHistory(
            session_id, project_id, db_path)
        self._chain = self._setup_chain()
        self._chain_with_history = self._setup_chain_with_history()

    def _setup_chain(self):
        """Configura el chain de LangChain con el system prompt del tipo de debate."""
        # llm = ChatOpenAI(model="gpt-5-mini-2025-08-07", temperature=0)
        llm = ChatOpenAI(model="gpt-5-2025-08-07", temperature=0)

        prompt = ChatPromptTemplate.from_messages([
            ("system", self.config.system_prompt),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])

        return prompt | llm

    def _setup_chain_with_history(self):
        """Configura el chain con historial de mensajes."""
        return RunnableWithMessageHistory(
            self._chain,
            lambda sid: TinyDBChatMessageHistory(
                sid, self.project_id, self.db_path),
            input_messages_key="input",
            history_messages_key="history",
        )

    def _format_transcription(self, transcripcion: list[dict]) -> str:
        """Formatea la transcripción para el prompt."""
        lines = []
        for seg in transcripcion:
            speaker = seg.get("speaker", "UNKNOWN")
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "")
            lines.append(f"[{start:.2f}s - {end:.2f}s] {speaker}: {text}")
        return "\n".join(lines)

    def _format_metrics(self, metricas: dict, orador_id: Optional[str] = None) -> str:
        """Formatea las métricas para el prompt, filtrando solo las clave."""
        lines = []

        if self.config.evaluation_mode == "per_team":
            # En modo equipo, mostrar métricas de todos los speakers del equipo
            for speaker, speaker_metrics in metricas.items():
                lines.append(f"Métricas de {speaker}:")
                for metric_name in KEY_METRICS:
                    value = speaker_metrics.get(metric_name, "N/A")
                    if isinstance(value, float):
                        value = f"{value:.4f}"
                    lines.append(f"  - {metric_name}: {value}")
                lines.append("")
        else:
            # Modo per_speaker: si se especifica un orador, usar solo sus métricas
            if orador_id and orador_id in metricas:
                speaker_metrics = metricas[orador_id]
                lines.append(f"Métricas de {orador_id}:")
                for metric_name in KEY_METRICS:
                    value = speaker_metrics.get(metric_name, "N/A")
                    if isinstance(value, float):
                        value = f"{value:.4f}"
                    lines.append(f"  - {metric_name}: {value}")
            else:
                # Mostrar métricas de todos los speakers
                for speaker, speaker_metrics in metricas.items():
                    lines.append(f"Métricas de {speaker}:")
                    for metric_name in KEY_METRICS:
                        value = speaker_metrics.get(metric_name, "N/A")
                        if isinstance(value, float):
                            value = f"{value:.4f}"
                        lines.append(f"  - {metric_name}: {value}")
                    lines.append("")

        return "\n".join(lines)

    def _get_parser(self, fase_id: str) -> PydanticOutputParser:
        """Retorna el parser adecuado según el tipo de debate y la fase."""
        if self.config.id == "retor":
            return PydanticOutputParser(pydantic_object=RetorEvaluationOutput)

        # UPCT: fase Final tiene modelo distinto
        if self.config.has_final_phase and fase_id == self.config.final_phase_id:
            return PydanticOutputParser(pydantic_object=FinalEvaluationOutput)
        return PydanticOutputParser(pydantic_object=EvaluationOutput)

    def _build_evaluation_prompt(
        self,
        fase_id: str,
        fase_nombre: str,
        postura: str,
        orador: str,
        transcripcion: list[dict],
        metricas: dict,
        duracion_segundos: Optional[float] = None
    ) -> str:
        """Construye el prompt de evaluación formateado según la config del debate."""
        parser = self._get_parser(fase_id)
        criterios = self.config.get_criterios_for_fase(fase_id)

        # Cabecera adaptada al modo de evaluación
        if self.config.evaluation_mode == "per_team":
            prompt_parts = [
                f"FASE: {fase_nombre}",
                f"EQUIPO: {postura}",
                "",
                "BLOQUES A EVALUAR:",
            ]
            # Incluir sub-items orientativos para RETOR
            for criterio_id in criterios:
                criterio_cfg = self.config.get_criterio_config(criterio_id)
                if criterio_cfg:
                    prompt_parts.append(
                        f"- {criterio_cfg.nombre} ({criterio_id})")
                    for sub in criterio_cfg.sub_items:
                        prompt_parts.append(f"    * {sub}")
                else:
                    prompt_parts.append(f"- {criterio_id}")
            prompt_parts.append("")
        else:
            prompt_parts = [
                f"FASE: {fase_nombre}",
                f"EQUIPO: {postura}",
                f"ORADOR: {orador}",
                "",
                "CRITERIOS A EVALUAR PARA ESTA FASE:",
                "\n".join(f"- {c}" for c in criterios),
                "",
            ]

        # Duración
        if duracion_segundos is not None:
            fase_cfg = self.config.get_fase_by_id(fase_id)
            tiempo_esperado = fase_cfg.tiempo_segundos if fase_cfg else 0
            prompt_parts.append(
                f"DURACIÓN DE LA INTERVENCIÓN: {duracion_segundos:.2f} segundos")
            if tiempo_esperado > 0:
                prompt_parts.append(
                    f"TIEMPO ASIGNADO A ESTA FASE: {tiempo_esperado} segundos")
            prompt_parts.append("")

        prompt_parts.extend([
            "TRANSCRIPCIÓN:",
            self._format_transcription(transcripcion),
            "",
            "MÉTRICAS PARALINGÜÍSTICAS:",
            self._format_metrics(metricas, orador),
            "",
            "FORMATO DE RESPUESTA REQUERIDO:",
            parser.get_format_instructions(),
        ])

        return "\n".join(prompt_parts)

    # ------------------------------------------------------------------
    # Backward-compatible send_evaluation (accepts DebateFase/Postura enums)
    # ------------------------------------------------------------------
    def send_evaluation(
        self,
        fase,  # DebateFase enum or str
        postura,  # Postura enum or str
        orador: str,
        transcripcion: list[dict],
        metricas: dict,
        duracion_segundos: Optional[float] = None
    ) -> EvaluationResult:
        """
        Envía una evaluación al LLM y retorna el resultado estructurado.

        Args:
            fase: Fase del debate (DebateFase enum para UPCT, o str fase_nombre para genérico)
            postura: Postura del equipo (Postura enum o str)
            orador: Identificador del orador (o descripción del equipo en RETOR)
            transcripcion: Lista de segmentos con speaker, text, start, end
            metricas: Dict de métricas por speaker
            duracion_segundos: Duración total de la intervención (opcional)

        Returns:
            EvaluationResult con las puntuaciones estructuradas
        """
        # Normalizar fase a (fase_id, fase_nombre)
        fase_nombre = fase.value if isinstance(fase, Enum) else str(fase)
        fase_config = self.config.get_fase_by_nombre(fase_nombre)
        if fase_config:
            fase_id = fase_config.id
        else:
            # Intentar buscar por id directamente
            fase_config = self.config.get_fase_by_id(fase_nombre)
            fase_id = fase_config.id if fase_config else fase_nombre
            fase_nombre = fase_config.nombre if fase_config else fase_nombre

        # Normalizar postura
        postura_str = postura.value if isinstance(
            postura, Enum) else str(postura)

        # Construir el prompt
        user_message = self._build_evaluation_prompt(
            fase_id, fase_nombre, postura_str, orador,
            transcripcion, metricas, duracion_segundos
        )

        # Invocar el chain con historial
        response = self._chain_with_history.invoke(
            {"input": user_message},
            config={"configurable": {"session_id": self.session_id}}
        )

        # Parsear la respuesta
        parser = self._get_parser(fase_id)
        parsed_output = parser.parse(response.content)

        # Construir el resultado
        anotaciones = getattr(parsed_output, 'anotaciones', {})
        return EvaluationResult(
            puntuaciones=parsed_output.puntuaciones,
            anotaciones=anotaciones,
            fase=fase_nombre,
            postura=postura_str,
            orador=orador,
            debate_type=self.config.id,
        )

    def send_message(self, message: str) -> str:
        """
        Envía un mensaje libre al chat (sin formato de evaluación).

        Args:
            message: Mensaje a enviar

        Returns:
            Respuesta del LLM como string
        """
        response = self._chain_with_history.invoke(
            {"input": message},
            config={"configurable": {"session_id": self.session_id}}
        )
        return response.content

    def get_history(self) -> list[dict]:
        """
        Obtiene el historial completo de mensajes de la sesión.

        Returns:
            Lista de mensajes con tipo y contenido
        """
        messages = self._history.messages
        history = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                history.append({"type": "human", "content": msg.content})
            elif isinstance(msg, AIMessage):
                history.append({"type": "ai", "content": msg.content})
            else:
                history.append({"type": "unknown", "content": str(msg)})
        return history

    def clear_history(self) -> None:
        """Limpia el historial de mensajes de la sesión."""
        self._history.clear()


def create_chat(
    project_id: str,
    session_id: str,
    db_path: str = "db.json",
    debate_type_config: Optional[DebateTypeConfig] = None,
) -> ChatSession:
    """
    Crea una nueva sesión de chat para evaluación de debates.

    Args:
        project_id: Identificador del proyecto/debate
        session_id: Identificador de la sesión de evaluación
        db_path: Ruta al archivo de base de datos TinyDB
        debate_type_config: Configuración del tipo de debate (None = UPCT por defecto)

    Returns:
        ChatSession configurada y lista para usar

    Example:
        >>> # UPCT (retrocompatible, sin config)
        >>> chat = create_chat("debate_001", "eval_session_1")
        >>> result = chat.send_evaluation(
        ...     fase=DebateFase.INTRO,
        ...     postura=Postura.FAVOR,
        ...     orador="Orador 1",
        ...     transcripcion=[{"speaker": "SPEAKER_00", "text": "...", "start": 0, "end": 10}],
        ...     metricas={"SPEAKER_00": {"loudness_sma3_amean": 0.5}}
        ... )
        >>>
        >>> # RETOR (con config explícita)
        >>> from data.debate_types import get_debate_type
        >>> retor_config = get_debate_type("retor")
        >>> chat = create_chat("debate_002", "eval_session_2", debate_type_config=retor_config)
        >>> result = chat.send_evaluation(
        ...     fase="Contextualizacion",
        ...     postura="A Favor",
        ...     orador="Equipo A",
        ...     transcripcion=[...],
        ...     metricas={...}
        ... )
    """
    return ChatSession(project_id, session_id, db_path, debate_type_config)
