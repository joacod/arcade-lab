import './menu-components.css';

/** Collection-wide modes; definitions and preparation belong to the owning game. */
export type ThemeMode = 'normal' | 'assets' | 'quality';
export type ThemeModes<Definition> = Readonly<Partial<Record<ThemeMode, Definition>>>;
export const initialTheme: ThemeMode = 'assets';
const labels: Record<ThemeMode, string> = { normal: 'Normal', assets: 'Assets', quality: 'Quality' };
let groupId = 0;

/** Direct player choices, with the development baseline kept out of the two-option switch. */
export function createThemeChoices<Mode extends ThemeMode>(config: {
  modes: Readonly<Partial<Record<Mode, unknown>>>;
  value: NoInfer<Mode>;
  names?: Readonly<Partial<Record<Mode, string>>>;
  signal: AbortSignal;
  onChange(mode: Mode): void;
}) {
  const playerModes: ThemeMode[] = ['assets', 'quality'];
  const modes: ThemeMode[] = import.meta.env.DEV ? [...playerModes, 'normal'] : playerModes;
  const available = (mode: ThemeMode) => Object.hasOwn(config.modes, mode) && config.modes[mode as Mode] != null;
  const element = document.createElement('fieldset'); element.className = 'menu-field menu-theme';
  element.setAttribute('aria-label', 'Theme');
  const legend = document.createElement('legend'); legend.textContent = 'Theme';
  const shortcut = document.createElement('span'); shortcut.className = 'menu-theme-shortcut'; shortcut.textContent = 'T to switch';
  legend.append(shortcut);
  const group = document.createElement('div'); group.className = 'menu-theme-choices';
  const note = document.createElement('small'); note.className = 'menu-theme-note'; note.id = `theme-note-${++groupId}`;
  element.setAttribute('aria-describedby', note.id);
  const name = `theme-${groupId}`;
  let current: ThemeMode = config.value, pending: ThemeMode | undefined, committed = false;
  const development = document.createElement('details'); development.className = 'menu-theme-development';
  const summary = document.createElement('summary'); summary.textContent = 'Development'; development.append(summary);
  const choices = modes.map(mode => {
    const label = document.createElement('label'); label.className = 'menu-theme-choice'; label.dataset.value = mode;
    const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = mode;
    input.disabled = !available(mode);
    const title = document.createElement('strong'); title.textContent = mode === 'normal' ? 'Normal baseline' : labels[mode];
    const detail = document.createElement('small'); detail.textContent = config.names?.[mode as Mode] ?? (mode === 'normal' ? 'Gameplay development' : mode === 'assets' ? 'Retro artwork' : 'Modern artwork');
    input.setAttribute('aria-label', `${labels[mode]}${config.names?.[mode as Mode] ? ` · ${config.names[mode as Mode]}` : ''}`);
    const loading = document.createElement('span'); loading.className = 'menu-theme-loading'; loading.textContent = 'Loading…'; loading.hidden = true; loading.setAttribute('aria-hidden', 'true');
    label.append(input, title, detail, loading);
    (mode === 'normal' ? development : group).append(label);
    input.addEventListener('change', () => select(mode), { signal: config.signal });
    input.addEventListener('click', () => select(mode), { signal: config.signal });
    return { mode, input, label, loading };
  });
  element.append(legend, group, note);
  if (import.meta.env.DEV) element.append(development);
  function render() {
    element.setAttribute('aria-busy', String(pending !== undefined));
    for (const choice of choices) {
      choice.input.checked = choice.mode === current && (committed || pending === undefined);
      choice.loading.hidden = pending !== choice.mode;
      choice.label.toggleAttribute('data-pending', pending === choice.mode);
    }
    const unavailable = playerModes.filter(mode => !available(mode));
    note.textContent = pending ? `Preparing ${labels[pending]}…${committed ? ` ${labels[current]} stays active.` : ''}`
      : current === 'normal' ? import.meta.env.DEV ? 'Normal baseline active · development only.' : 'Artwork unavailable. Choose Assets or Quality.'
      : `Visuals only · keeps your run.${unavailable.length ? ` Unavailable: ${unavailable.map(mode => labels[mode]).join(', ')}.` : ''}`;
    summary.textContent = current === 'normal' && committed ? 'Development · Normal active' : 'Development';
  }
  function prepare(mode: Mode) { pending = mode; render(); }
  function setValue(mode: Mode) { current = mode; committed = true; pending = undefined; render(); }
  function select(mode: ThemeMode) {
    if (config.signal.aborted || !available(mode)) return;
    if (mode === pending || mode === current && pending === undefined) { render(); return; }
    prepare(mode as Mode); config.onChange(mode as Mode);
  }
  function cycle() {
    const enabled = playerModes.filter(available);
    const next = enabled[(enabled.indexOf(pending ?? current) + 1) % enabled.length];
    if (next) select(next);
  }
  render();
  return { element, input: choices[0]!.input, setValue, prepare, cycle };
}
