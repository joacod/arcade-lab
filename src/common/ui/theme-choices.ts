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
  const legend = document.createElement('legend');
  legend.innerHTML = '<svg class="menu-theme-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="11" cy="6.5" r="1"/><circle cx="16" cy="8" r="1"/></svg><span>Theme</span>';
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
    const icon = document.createElement('span'); icon.className = 'menu-theme-icon'; icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = mode === 'deluxe'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
    label.append(input, icon, title, detail, loading);
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
  render();
  return { element, input: choices[0]!.input, setValue, prepare };
}
