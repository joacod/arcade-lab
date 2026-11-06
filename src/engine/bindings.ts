/** Physical keyboard codes grouped by semantic action. Pointer buttons use the same action IDs. */
export type KeyBindings<Action extends string> = Readonly<Record<Action, readonly string[]>>;

/** Reject ambiguous layouts before replacing a working binding set. */
export function createKeyMap<Action extends string>(bindings: KeyBindings<Action>): ReadonlyMap<string, Action> {
  const keys = new Map<string, Action>();
  for (const action of Object.keys(bindings) as Action[]) {
    for (const code of bindings[action]) {
      const previous = keys.get(code);
      if (previous !== undefined && previous !== action) throw new Error(`${code} is bound to both ${previous} and ${action}`);
      keys.set(code, action);
    }
  }
  return keys;
}

/** Labels describe physical key positions, matching KeyboardEvent.code. */
export function keyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return ({ ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space',
    ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift' } as Record<string, string>)[code] ?? code;
}

export function bindingLabel(codes: readonly string[]): string { return codes.map(keyLabel).join(' / '); }
