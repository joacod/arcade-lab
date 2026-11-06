interface KeyboardChoice {
  name: string;
  description: string;
}

/** Native session-local layout choices; bindings and action meanings stay with each game. */
export function createKeyboardChoices<Layout extends string>(options: {
  id: string;
  choices: Record<Layout, KeyboardChoice>;
  value: Layout;
  signal: AbortSignal;
  onChange(value: Layout): void;
}) {
  const element = document.createElement('fieldset');
  element.className = 'menu-choice-group';
  const legend = document.createElement('legend'); legend.textContent = 'Keyboard layout';
  const grid = document.createElement('div'); grid.className = 'menu-choice-grid';
  for (const value of Object.keys(options.choices) as Layout[]) {
    const choice = options.choices[value], label = document.createElement('label'); label.className = 'menu-choice';
    const input = document.createElement('input'); input.type = 'radio'; input.name = `${options.id}-keyboard`;
    input.value = value; input.checked = value === options.value;
    const name = document.createElement('strong'); name.textContent = choice.name;
    const description = document.createElement('small'); description.textContent = choice.description;
    input.addEventListener('change', () => { if (input.checked) options.onChange(value); }, { signal: options.signal });
    label.append(input, name, description); grid.append(label);
  }
  element.append(legend, grid);
  return element;
}
