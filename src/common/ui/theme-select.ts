import { createSelectField } from './menu-components.ts';

/** Collection-wide presentation modes. Definitions and renderer choices belong to games. */
export type ThemeMode = 'normal' | 'assets' | 'quality' | 'custom';
export type ThemeModes<Definition> = Readonly<Partial<Record<ThemeMode, Definition>>>;
const labels: Record<ThemeMode, string> = { normal: 'Normal', assets: 'Assets', quality: 'Quality', custom: 'Custom' };

/** Always show the three standard modes; expose Custom only when the game supplies it. */
export function createThemeSelect<Mode extends ThemeMode>(config: {
  modes: Readonly<Partial<Record<Mode, unknown>>>;
  value: NoInfer<Mode>;
  signal: AbortSignal;
  onChange(mode: Mode): void;
}) {
  const modes: ThemeMode[] = ['normal', 'assets', 'quality'];
  if ('custom' in config.modes) modes.push('custom');
  const available = (mode: ThemeMode) => Object.hasOwn(config.modes, mode) && config.modes[mode as Mode] != null;
  const choices = Object.fromEntries(modes.map(mode => [mode, available(mode) ? labels[mode] : `${labels[mode]} (not available)`])) as Record<ThemeMode, string>;
  const field = createSelectField({ label: 'Theme', choices, value: config.value, signal: config.signal,
    onChange(mode) { if (available(mode)) config.onChange(mode as Mode); },
  });
  for (const option of field.input.options) option.disabled = !available(option.value as ThemeMode);
  return field;
}
