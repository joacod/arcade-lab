import './menu-components.css';

interface FieldOptions {
  label: string;
  /** Supply only when the accessible name needs more context than the visible label. */
  accessibleLabel?: string;
  signal: AbortSignal;
}

let fieldId = 0;

/** A web-rendered select. Focus stays on the combobox while arrows preview options. */
export function createSelectField<Value extends string>(config: FieldOptions & {
  choices: Readonly<Record<Value, string>>;
  disabled?: readonly NoInfer<Value>[];
  value: NoInfer<Value>;
  onChange(value: Value): void;
}) {
  const element = document.createElement('div'); element.className = 'menu-field';
  const label = document.createElement('span'); label.textContent = config.label;
  const input = document.createElement('button'); input.type = 'button'; input.className = 'menu-select';
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-label', config.accessibleLabel ?? config.label);
  input.setAttribute('aria-expanded', 'false');
  const list = document.createElement('div'); list.className = 'menu-select-options'; list.popover = 'auto';
  list.id = `menu-options-${++fieldId}`; list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', `${config.accessibleLabel ?? config.label} options`);
  input.setAttribute('aria-controls', list.id);
  const choices = (Object.entries(config.choices) as [Value, string][]).map(([value, text], index) => {
    const option = document.createElement('div'); option.setAttribute('role', 'option');
    option.id = `${list.id}-${index}`; option.dataset.value = value; option.textContent = text;
    const disabled = config.disabled?.includes(value) ?? false;
    option.setAttribute('aria-disabled', String(disabled)); list.append(option);
    return { value, text, option, disabled };
  });
  let current: Value, active = -1, search = '', searchedAt = 0;
  const isOpen = () => list.matches(':popover-open');
  function setValue(value: Value) {
    const choice = choices.find(choice => choice.value === value);
    if (!choice || current === value) return;
    current = value; input.value = value; input.textContent = choice.text;
    for (const choice of choices) choice.option.setAttribute('aria-selected', String(choice.value === value));
  }
  function preview(index: number) {
    active = index;
    for (const [i, choice] of choices.entries()) choice.option.classList.toggle('is-active', i === index);
    const option = choices[index]?.option;
    if (option) { input.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block: 'nearest' }); }
  }
  function close() { if (isOpen()) list.hidePopover(); }
  function open() {
    if (config.signal.aborted || isOpen()) return;
    // The top layer escapes the menu's scrolling/clipping, including in fullscreen.
    const bounds = input.getBoundingClientRect(), margin = 8;
    const below = window.innerHeight - bounds.bottom - margin;
    const above = bounds.top - margin;
    const down = below >= Math.min(240, list.scrollHeight || 240) || below >= above;
    list.style.width = `${bounds.width}px`;
    list.style.left = `${Math.max(margin, Math.min(bounds.left, window.innerWidth - bounds.width - margin))}px`;
    list.style.maxHeight = `${Math.max(0, Math.min(320, down ? below : above) - 6)}px`;
    list.style.top = down ? `${bounds.bottom + 6}px` : 'auto';
    list.style.bottom = down ? 'auto' : `${window.innerHeight - bounds.top + 6}px`;
    list.showPopover(); input.setAttribute('aria-expanded', 'true');
    preview(choices.findIndex(choice => choice.value === current && !choice.disabled));
  }
  function commit(index: number) {
    const choice = choices[index]; if (!choice || choice.disabled) return;
    const changed = current !== choice.value;
    setValue(choice.value); close(); input.focus({ preventScroll: true });
    if (changed) config.onChange(choice.value);
  }
  const events = { signal: config.signal };
  input.addEventListener('click', () => { if (isOpen()) close(); else open(); }, events);
  input.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (event.key === 'Tab') { close(); return; }
    if (event.key === 'Escape') {
      if (isOpen()) { event.preventDefault(); event.stopPropagation(); close(); }
      return;
    }
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault(); if (event.repeat) return;
      if (isOpen()) commit(active); else open();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!isOpen()) { open(); if (event.key.startsWith('Arrow')) return; }
      const enabled = choices.flatMap((choice, i) => choice.disabled ? [] : [i]);
      const position = enabled.indexOf(active);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
        : (position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
      if (enabled[index] !== undefined) preview(enabled[index]);
    } else if (event.key.length === 1) {
      event.preventDefault(); open();
      const now = performance.now(); search = now - searchedAt > 700 ? event.key : search + event.key; searchedAt = now;
      const index = choices.findIndex(choice => !choice.disabled && choice.text.toLowerCase().startsWith(search.toLowerCase()));
      if (index >= 0) preview(index);
    }
  }, events);
  list.addEventListener('pointerdown', event => event.preventDefault(), events);
  for (const [index, choice] of choices.entries()) {
    choice.option.addEventListener('pointermove', () => { if (!choice.disabled && active !== index) preview(index); }, events);
    choice.option.addEventListener('click', () => commit(index), events);
  }
  list.addEventListener('beforetoggle', event => {
    if (event.newState !== 'closed') return;
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); search = '';
  }, events);
  input.addEventListener('blur', close, events);
  window.addEventListener('resize', close, events);
  window.addEventListener('blur', close, events);
  document.addEventListener('scroll', event => { if (event.target !== list) close(); }, { ...events, capture: true });
  config.signal.addEventListener('abort', close, { once: true });
  element.append(label, input, list); setValue(config.value);
  return { element, input, setValue };
}

/** A multiline score/result readout. Games own its text, formatting and visibility. */
export function createMenuReadout(label: string) {
  const element = document.createElement('output'); element.className = 'menu-readout';
  element.setAttribute('aria-label', label);
  // Sessions update results every frame; do not announce those updates as status messages.
  element.setAttribute('aria-live', 'off');
  element.hidden = true;
  return {
    element,
    update(text: string) { if (element.value !== text) element.value = text; },
  };
}
