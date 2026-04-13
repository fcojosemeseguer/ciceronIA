export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

export const THEME_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  description: string;
}> = [
  { id: 'light', label: 'Claro', description: 'Interfaz luminosa y limpia.' },
  { id: 'dark', label: 'Oscuro', description: 'Interfaz oscura con alto contraste.' },
];

const SETTINGS_KEY = 'ciceron_settings';

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
  if (typeof window === 'undefined') return DEFAULT_THEME_PREFERENCE;

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_THEME_PREFERENCE;
    const parsed = JSON.parse(raw);
    const stored = parsed?.theme;
    if (stored === 'light' || stored === 'dark') return stored;
    return DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
};

export const initThemeSync = () => {
  if (typeof window === 'undefined') return () => {};

  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const sync = () => {
    const preference = getStoredThemePreference();
    applyTheme(preference);
  };

  sync();

  const onChange = () => {
    if (getStoredThemePreference() === 'system') {
      applyTheme('system');
    }
  };

  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
