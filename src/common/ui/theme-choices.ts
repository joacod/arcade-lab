import './menu-components.css';

/** Collection-wide modes; definitions and preparation belong to the owning game. */
export type ThemeMode = 'prototype' | 'arcade' | 'deluxe';
export type ThemeModes<Definition> = Readonly<Partial<Record<ThemeMode, Definition>>>;
/** A completed Arcade replaces its prototype; Deluxe extends an existing Arcade. */
export function availableThemes<Mode extends ThemeMode>(definitions: Readonly<Partial<Record<Mode, unknown>>>): Mode[] {
  const has = (mode: ThemeMode) => Object.hasOwn(definitions, mode) && definitions[mode as Mode] != null;
  if (has('arcade')) return (has('deluxe') ? ['arcade', 'deluxe'] : ['arcade']) as Mode[];
  if (has('prototype')) return ['prototype'] as Mode[];
  throw new Error('A game needs Arcade or Prototype before it can be mounted.');
}
export function defaultTheme<Mode extends ThemeMode>(definitions: Readonly<Partial<Record<Mode, unknown>>>): Mode {
  return availableThemes(definitions)[0]!;
}
const labels: Record<ThemeMode, string> = { prototype: 'Prototype', arcade: 'Arcade', deluxe: 'Deluxe' };
let groupId = 0;

/** Direct choices from implemented presentations, identical in every build. */
export function createThemeChoices<Mode extends ThemeMode>(config: {
  modes: Readonly<Partial<Record<Mode, unknown>>>;
  value: NoInfer<Mode>;
  names?: Readonly<Partial<Record<Mode, string>>>;
  signal: AbortSignal;
  onChange(mode: Mode): void;
}) {
  const modes = availableThemes(config.modes);
  const available = (mode: ThemeMode) => modes.includes(mode as Mode);
  const element = document.createElement('fieldset'); element.className = 'menu-field menu-theme';
  element.hidden = modes.length < 2;
  element.setAttribute('aria-label', 'Theme');
  const legend = document.createElement('legend'); legend.textContent = 'Theme';
  const shortcut = document.createElement('span'); shortcut.className = 'menu-theme-shortcut'; shortcut.textContent = 'T to switch';
  legend.append(shortcut);
  const group = document.createElement('div'); group.className = 'menu-theme-choices';
  const note = document.createElement('small'); note.className = 'menu-theme-note'; note.id = `theme-note-${++groupId}`;
  element.setAttribute('aria-describedby', note.id);
  const name = `theme-${groupId}`;
  let current: ThemeMode = available(config.value) ? config.value : modes[0]!, pending: ThemeMode | undefined, committed = false;
  const choices = modes.map(mode => {
    const label = document.createElement('label'); label.className = 'menu-theme-choice'; label.dataset.value = mode;
    const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = mode;
    const title = document.createElement('strong'); title.textContent = labels[mode];
    const detail = document.createElement('small'); detail.textContent = config.names?.[mode as Mode] ?? (mode === 'prototype' ? 'Gameplay development' : mode === 'arcade' ? 'Finished artwork' : 'Enhanced artwork');
    input.setAttribute('aria-label', `${labels[mode]}${config.names?.[mode as Mode] ? ` · ${config.names[mode as Mode]}` : ''}`);
    const loading = document.createElement('span'); loading.className = 'menu-theme-loading'; loading.textContent = 'Loading…'; loading.hidden = true; loading.setAttribute('aria-hidden', 'true');
    label.append(input, title, detail, loading);
    group.append(label);
    input.addEventListener('change', () => select(mode), { signal: config.signal });
    input.addEventListener('click', () => select(mode), { signal: config.signal });
    return { mode, input, label, loading };
  });
  element.append(legend, group, note);
  function render() {
    element.setAttribute('aria-busy', String(pending !== undefined));
    for (const choice of choices) {
      choice.input.checked = choice.mode === current && (committed || pending === undefined);
      choice.loading.hidden = pending !== choice.mode;
      choice.label.toggleAttribute('data-pending', pending === choice.mode);
    }
    note.textContent = pending ? `Preparing ${labels[pending]}…${committed ? ` ${labels[current]} stays active.` : ''}`
      : 'Visuals only · keeps your run.';
  }
  function prepare(mode: Mode) { if (!available(mode)) return; pending = mode; render(); }
  function setValue(mode: Mode) { if (!available(mode)) return; current = mode; committed = true; pending = undefined; render(); }

  function select(mode: ThemeMode) {
    if (config.signal.aborted || !available(mode)) return;
    if (mode === pending || mode === current && pending === undefined) { render(); return; }
    prepare(mode as Mode); config.onChange(mode as Mode);
  }
  function cycle() {
    const enabled = modes;
    const next = enabled[(enabled.indexOf((pending ?? current) as Mode) + 1) % enabled.length];
    if (enabled.length > 1 && next) select(next);
  }
  render();
  return { element, input: choices[0]!.input, setValue, prepare, cycle };
}
