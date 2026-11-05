import './menu-components.css';

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
