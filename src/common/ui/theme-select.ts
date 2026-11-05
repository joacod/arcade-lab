import { createSelectField } from './menu-components.ts';

/** Collection-wide presentation modes. Definitions and renderer choices belong to games. */
export type ThemeMode = 'normal' | 'assets' | 'quality';
export type ThemeModes<Definition> = Readonly<Partial<Record<ThemeMode, Definition>>>;
const labels: Record<ThemeMode, string> = { normal: 'Normal', assets: 'Assets', quality: 'Quality' };
export const initialTheme: ThemeMode = import.meta.env.DEV ? 'normal' : 'assets';

/** Development exposes the baseline; deployed games offer the two finished presentations. */
export function createThemeSelect<Mode extends ThemeMode>(config: {
  modes: Readonly<Partial<Record<Mode, unknown>>>;
  value: NoInfer<Mode>;
  names?: Readonly<Partial<Record<Mode, string>>>;
  signal: AbortSignal;
  onChange(mode: Mode): void;
}) {
  const modes: ThemeMode[] = import.meta.env.DEV ? ['normal', 'assets', 'quality'] : ['assets', 'quality'];
  const available = (mode: ThemeMode) => Object.hasOwn(config.modes, mode) && config.modes[mode as Mode] != null;
  let current: ThemeMode = config.value;
  const choices = Object.fromEntries(modes.map(mode => {
    const name = config.names?.[mode as Mode];
    return [mode, available(mode) ? `${labels[mode]}${name && name !== labels[mode] ? ` · ${name}` : ''}` : `${labels[mode]} (not available)`];
  })) as Record<ThemeMode, string>;
  const note = document.createElement('small'); note.className = 'menu-theme-note';
  const unavailable = modes.filter(mode => !available(mode));
  const explanation = `Visuals only · keeps your run.${unavailable.length ? ` Unavailable: ${unavailable.map(mode => labels[mode]).join(', ')}.` : ''}`;
  note.textContent = explanation;
  const field = import.meta.env.DEV ? createSelectField({ label: 'Theme (T)', accessibleLabel: 'Theme', choices, value: config.value, signal: config.signal,
    disabled: modes.filter(mode => !available(mode)), onChange: select,
  }) : createThemeButtons();
  field.element.append(note);
  field.element.classList.add('menu-theme');
  function select(mode: ThemeMode) {
    if (config.signal.aborted || !available(mode)) return;
    current = mode;
    config.onChange(mode as Mode);
  }
  function setValue(mode: Mode) {
    current = mode; field.setValue(mode);
    note.textContent = !modes.includes(mode) ? 'Artwork unavailable. Choose Assets or Quality.' : explanation;
  }
  function cycle() {
    if (config.signal.aborted) return;
    const enabled = modes.filter(available);
    if (enabled.length < 2 && enabled.includes(current)) return;
    const next = enabled[(enabled.indexOf(current) + 1) % enabled.length];
    if (next) { field.setValue(next); select(next); }
  }
  function createThemeButtons() {
    const element = document.createElement('div'); element.className = 'menu-field';
    const label = document.createElement('span'); label.textContent = 'Theme (T)';
    const group = document.createElement('div'); group.className = 'menu-theme-choices'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Theme');
    const buttons = modes.map(mode => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.value = mode;
      button.disabled = !available(mode); button.setAttribute('aria-label', choices[mode]);
      const title = document.createElement('strong'); title.textContent = labels[mode];
      const name = document.createElement('small'); name.textContent = config.names?.[mode as Mode] ?? (mode === 'assets' ? 'Retro artwork' : 'Modern artwork');
      button.append(title, name); group.append(button);
      button.addEventListener('click', () => { if (mode !== current) { sync(mode); select(mode); } }, { signal: config.signal });
      return button;
    });
    function sync(value: ThemeMode) { for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.value === value)); }
    sync(config.value); element.append(label, group);
    return { element, input: buttons[0]!, setValue: sync };
  }
  return { ...field, setValue, cycle };
}
