export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';

export const THEME_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  description: string;
}> = [
  { id: 'light', label: 'Claro', description: 'Interfaz luminosa y limpia.' },
  { id: 'dark', label: 'Oscuro', description: 'Interfaz oscura con alto contraste.' },
];

const getSystemTheme = (): ThemeMode => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const resolveThemePreference = (preference: ThemePreference): ThemeMode => {
  return preference === 'system' ? getSystemTheme() : preference;
};

export const applyTheme = (preference: ThemePreference = DEFAULT_THEME_PREFERENCE) => {
  if (typeof document === 'undefined') return;
  const resolved = resolveThemePreference(preference);
  document.documentElement.dataset.theme = resolved;
};

export const getStoredThemePreference = (): ThemePreference => {
  return DEFAULT_THEME_PREFERENCE;
};

export const initThemeSync = () => {
  applyTheme('light');
  return () => {};
};
