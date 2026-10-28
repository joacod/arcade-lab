/** Cache references only to stable, session-owned elements, never rebuilt choice lists. */
export function createElementLookup(root: HTMLElement) {
  const elements = new Map<string, Element>();
  return <T extends Element = HTMLElement>(selector: string): T => {
    let element = elements.get(selector);
    if (!element) {
      element = root.querySelector(selector) ?? undefined;
      if (!element) throw new Error(`Missing UI element: ${selector}`);
      elements.set(selector, element);
    }
    return element as T;
  };
}

/** Frame-driven readouts should mutate the DOM only when their displayed value changes. */
export function setText(element: Element, value: string) {
  if (element.textContent !== value) element.textContent = value;
}

export function setAttribute(element: Element, name: string, value: string) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

export function setProperty<T, K extends keyof T>(element: T, key: K, value: T[K]) {
  if (element[key] !== value) element[key] = value;
}
