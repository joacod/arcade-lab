import './menu-components.css';

interface FieldOptions {
  label: string;
  /** Supply only when the accessible name needs more context than the visible label. */
  accessibleLabel?: string;
  signal: AbortSignal;
}

/** Native controls keep keyboard behavior and labels; the session owns their listeners. */
export function createSelectField<Value extends string>(config: FieldOptions & {
  choices: Readonly<Record<Value, string>>;
  value: NoInfer<Value>;
  onChange(value: Value): void;
}) {
  const element = document.createElement('label'); element.className = 'menu-field';
  element.append(config.label);
  const input = document.createElement('select');
  input.setAttribute('aria-label', config.accessibleLabel ?? config.label);
  const choices = Object.entries(config.choices) as [Value, string][];
  for (const [value, label] of choices) {
    const option = document.createElement('option'); option.value = value; option.textContent = label;
    input.append(option);
  }
  input.value = config.value;
  input.addEventListener('change', () => {
    const choice = choices.find(([value]) => value === input.value);
    if (choice) config.onChange(choice[0]);
  }, { signal: config.signal });
  element.append(input);
  return { element, input };
}

export function createRangeField(config: FieldOptions & {
  min: number;
  max: number;
  step: number;
  value: number;
  onInput(value: number): void;
}) {
  const element = document.createElement('label'); element.className = 'menu-range';
  element.append(config.label);
  const input = document.createElement('input'); input.type = 'range';
  input.min = String(config.min); input.max = String(config.max); input.step = String(config.step); input.value = String(config.value);
  input.setAttribute('aria-label', config.accessibleLabel ?? config.label);
  input.addEventListener('input', () => config.onInput(input.valueAsNumber), { signal: config.signal });
  element.append(input);
  return { element, input };
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
