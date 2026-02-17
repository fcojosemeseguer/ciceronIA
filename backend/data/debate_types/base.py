"""
Modelo base para la configuracion de tipos de debate.

Cada tipo de debate (UPCT, RETOR, etc.) debe crear una instancia de
DebateTypeConfig con sus propias fases, criterios, escala y prompts.
"""

from dataclasses import dataclass, field


@dataclass
class FaseConfig:
    """Configuracion de una fase individual del debate."""
    id: str                     # Identificador interno (ej: "intro", "contextualizacion")
    nombre: str                 # Nombre display (ej: "Introduccion", "Contextualizacion")
    descripcion: str            # Descripcion de lo que se espera en esta fase
    tiempo_segundos: int = 0    # Tiempo asignado (0 = sin limite estricto)
    permite_preguntas: bool = True
    permite_minuto_oro: bool = False
    orador_unico: bool = False  # True si la fase debe hacerla un solo orador (ej: Conclusion RETOR)


@dataclass
class CriterioConfig:
    """Configuracion de un criterio de evaluacion."""
    id: str                     # Identificador interno (ej: "comprension_mocion")
    nombre: str                 # Nombre display
    descripcion: str            # Descripcion completa del criterio
    sub_items: list[str] = field(default_factory=list)  # Sub-items orientativos (RETOR)


@dataclass
class DebateTypeConfig:
    """
    Configuracion completa de un tipo de debate.
    
    Cada tipo de debate define:
    - Sus fases y tiempos
    - Sus criterios de evaluacion (pueden ser por fase o globales)
    - Su escala de puntuacion
    - Su modo de evaluacion (por orador individual o por equipo)
    - Sus prompts especificos para el LLM
    """
    id: str                                     # "upct" | "retor"
    nombre: str                                 # Nombre display
    descripcion: str                            # Descripcion del formato

    # Fases del debate
    fases: list[FaseConfig] = field(default_factory=list)
    
    # Posturas posibles
    posturas: list[str] = field(default_factory=lambda: ["A Favor", "En Contra"])

    # Criterios de evaluacion
    # Para UPCT: dict fase_id -> [criterio_ids] (criterios distintos por fase)
    # Para RETOR: dict "global" -> [CriterioConfig] (criterios globales para todo el debate)
    criterios_por_fase: dict[str, list[str]] = field(default_factory=dict)
    criterios_config: list[CriterioConfig] = field(default_factory=list)

    # Escala de puntuacion
    escala_min: int = 0
    escala_max: int = 4

    # Modo de evaluacion
    # "per_speaker": evalua cada orador en cada fase individualmente (UPCT)
    # "per_team": acumula info por fases, evaluacion de bloques por equipo (RETOR)
    evaluation_mode: str = "per_speaker"

    # Tiene fase "Final" especial (UPCT: si, RETOR: no)
    has_final_phase: bool = False
    final_phase_id: str | None = None

    # Prompts
    system_prompt: str = ""
    normativa: str = ""

    # Tiempos por fase (fase_id -> segundos)
    tiempos_por_fase: dict[str, int] = field(default_factory=dict)

    def get_fase_by_id(self, fase_id: str) -> FaseConfig | None:
        """Busca una fase por su ID."""
        for fase in self.fases:
            if fase.id == fase_id:
                return fase
        return None

    def get_fase_by_nombre(self, nombre: str) -> FaseConfig | None:
        """Busca una fase por su nombre display."""
        for fase in self.fases:
            if fase.nombre == nombre:
                return fase
        return None

    def get_criterios_for_fase(self, fase_id: str) -> list[str]:
        """Devuelve los IDs de criterios para una fase dada."""
        if self.evaluation_mode == "per_team":
            # En modo equipo, los criterios son globales
            return [c.id for c in self.criterios_config]
        return self.criterios_por_fase.get(fase_id, [])

    def get_criterio_config(self, criterio_id: str) -> CriterioConfig | None:
        """Busca un criterio por su ID."""
        for c in self.criterios_config:
            if c.id == criterio_id:
                return c
        return None

    def get_fases_nombres(self) -> dict[str, str]:
        """Devuelve un dict nombre -> id para las fases."""
        return {f.nombre: f.id for f in self.fases}

    def get_posturas_validas(self) -> list[str]:
        """Devuelve las posturas validas."""
        return self.posturas

    def get_max_score_per_item(self) -> int:
        """Puntuacion maxima por item."""
        return self.escala_max

    def get_min_score_per_item(self) -> int:
        """Puntuacion minima por item."""
        return self.escala_min
