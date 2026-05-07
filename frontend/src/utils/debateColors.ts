export interface DebateTeamColors {
  team_a_color: string;
  team_b_color: string;
}

const getKey = (debateCode: string) => `ciceronia:debate-colors:${debateCode}`;

export const saveDebateTeamColors = (debateCode: string, colors: DebateTeamColors) => {
  if (typeof window === 'undefined' || !debateCode) return;
  window.localStorage.setItem(getKey(debateCode), JSON.stringify(colors));
};

export const loadDebateTeamColors = (debateCode: string): DebateTeamColors | null => {
  if (typeof window === 'undefined' || !debateCode) return null;
  try {
    const raw = window.localStorage.getItem(getKey(debateCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DebateTeamColors>;
    if (!parsed.team_a_color || !parsed.team_b_color) return null;
    return {
      team_a_color: parsed.team_a_color,
      team_b_color: parsed.team_b_color,
    };
  } catch {
    return null;
  }
};
