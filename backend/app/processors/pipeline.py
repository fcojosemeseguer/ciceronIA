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

load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OpenAI key not found")


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


class EvaluationResult(BaseModel):
    """Resultado estructurado de una evaluación de debate."""
    puntuaciones: dict[str, int] = Field(
        description="Diccionario con criterio como clave y puntuación (0-4) como valor"
    )
    anotaciones: dict[str, str] = Field(
        description="Diccionario con criterio como clave y sugerencia breve de mejora como valor"
    )
    fase: str = Field(description="Fase del debate evaluada")
    postura: str = Field(description="Postura del equipo: A Favor o En Contra")
    orador: str = Field(description="Identificador del orador evaluado")


class EvaluationOutput(BaseModel):
    """Modelo para parsear la respuesta del LLM."""
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
    """Modelo para parsear la respuesta del LLM en fase Final."""
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


class ChatSession:
    """
    Sesión de chat para evaluar debates.

    Mantiene el historial de conversación y permite enviar evaluaciones
    estructuradas al LLM juez de debate.
    """

    def __init__(self, project_id: str, session_id: str, db_path: str = "db.json"):
        self.project_id = project_id
        self.session_id = session_id
        self.db_path = db_path
        self._history = TinyDBChatMessageHistory(
            session_id, project_id, db_path)
        self._chain = self._setup_chain()
        self._chain_with_history = self._setup_chain_with_history()

    def _setup_chain(self):
        """Configura el chain de LangChain."""
        # llm = ChatOpenAI(model="gpt-5-mini-2025-08-07", temperature=0)
        llm = ChatOpenAI(model="gpt-5-2025-08-07", temperature=0)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt_evaluation),
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

        # Si se especifica un orador, usar solo sus métricas
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

    def _get_parser_for_fase(self, fase: DebateFase) -> PydanticOutputParser:
        """Retorna el parser adecuado según la fase."""
        if fase == DebateFase.FINAL:
            return PydanticOutputParser(pydantic_object=FinalEvaluationOutput)
        return PydanticOutputParser(pydantic_object=EvaluationOutput)

    def _build_evaluation_prompt(
        self,
        fase: DebateFase,
        postura: Postura,
        orador: str,
        transcripcion: list[dict],
        metricas: dict,
        duracion_segundos: Optional[float] = None
    ) -> str:
        """Construye el prompt de evaluación formateado."""
        parser = self._get_parser_for_fase(fase)
        criterios = CRITERIOS_POR_FASE[fase]

        prompt_parts = [
            f"FASE: {fase.value}",
            f"EQUIPO: {postura.value}",
            f"ORADOR: {orador}",
            "",
            f"CRITERIOS A EVALUAR PARA ESTA FASE:",
            "\n".join(f"- {c}" for c in criterios),
            "",
        ]

        if duracion_segundos is not None:
            prompt_parts.extend([
                f"DURACIÓN DE LA INTERVENCIÓN: {duracion_segundos:.2f} segundos",
                ""
            ])

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

    def send_evaluation(
        self,
        fase: DebateFase,
        postura: Postura,
        orador: str,
        transcripcion: list[dict],
        metricas: dict,
        duracion_segundos: Optional[float] = None
    ) -> EvaluationResult:
        """
        Envía una evaluación al LLM y retorna el resultado estructurado.

        Args:
            fase: Fase del debate (INTRO, REF1, REF2, CONCLUSION, FINAL)
            postura: Postura del equipo (FAVOR o CONTRA)
            orador: Identificador del orador
            transcripcion: Lista de segmentos con speaker, text, start, end
            metricas: Dict de métricas por speaker
            duracion_segundos: Duración total de la intervención (opcional)

        Returns:
            EvaluationResult con las puntuaciones estructuradas
        """
        # Construir el prompt
        user_message = self._build_evaluation_prompt(
            fase, postura, orador, transcripcion, metricas, duracion_segundos
        )

        # Invocar el chain con historial
        response = self._chain_with_history.invoke(
            {"input": user_message},
            config={"configurable": {"session_id": self.session_id}}
        )

        # Parsear la respuesta
        parser = self._get_parser_for_fase(fase)
        parsed_output = parser.parse(response.content)

        # Construir el resultado
        anotaciones = getattr(parsed_output, 'anotaciones', {})
        return EvaluationResult(
            puntuaciones=parsed_output.puntuaciones,
            anotaciones=anotaciones,
            fase=fase.value,
            postura=postura.value,
            orador=orador
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


def create_chat(project_id: str, session_id: str, db_path: str = "db.json") -> ChatSession:
    """
    Crea una nueva sesión de chat para evaluación de debates.

    Args:
        project_id: Identificador del proyecto/debate
        session_id: Identificador de la sesión de evaluación
        db_path: Ruta al archivo de base de datos TinyDB

    Returns:
        ChatSession configurada y lista para usar

    Example:
        >>> chat = create_chat("debate_001", "eval_session_1")
        >>> 
        >>> # Evaluar introducción del equipo A Favor
        >>> result = chat.send_evaluation(
        ...     fase=DebateFase.INTRO,
        ...     postura=Postura.FAVOR,
        ...     orador="Orador 1",
        ...     transcripcion=[{"speaker": "SPEAKER_00", "text": "...", "start": 0, "end": 10}],
        ...     metricas={"SPEAKER_00": {"loudness_sma3_amean": 0.5, ...}}
        ... )
        >>> 
        >>> # Evaluar introducción del equipo En Contra
        >>> result = chat.send_evaluation(
        ...     fase=DebateFase.INTRO,
        ...     postura=Postura.CONTRA,
        ...     orador="Orador 2",
        ...     transcripcion=[...],
        ...     metricas={...}
        ... )
        >>> 
        >>> print(result.puntuaciones)
        >>> print(result.postura)  # "En Contra"
    """
    return ChatSession(project_id, session_id, db_path)
