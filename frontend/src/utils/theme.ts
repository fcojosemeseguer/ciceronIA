export type AppTheme = 'obsidian' | 'graphite' | 'ocean' | 'paper';

export const DEFAULT_THEME: AppTheme = 'obsidian';

export const THEME_OPTIONS: Array<{
  id: AppTheme;
  label: string;
  description: string;
}> = [
  { id: 'obsidian', label: 'Obsidian', description: 'Oscuro profundo y sobrio.' },
  { id: 'graphite', label: 'Graphite', description: 'Grises limpios y contraste suave.' },
  { id: 'ocean', label: 'Ocean', description: 'Azules fríos con ambiente técnico.' },
  { id: 'paper', label: 'Paper', description: 'Claro, limpio y más editorial.' },
];

export const applyTheme = (theme: AppTheme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
};

export const getStoredTheme = (): AppTheme => {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  try {
    const raw = window.localStorage.getItem('ciceron_settings');
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    const theme = parsed?.theme;
    return THEME_OPTIONS.some((option) => option.id === theme) ? theme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};
