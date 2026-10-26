interface ClearingContent {
  readonly arena: { readonly width: number; readonly height: number };
  readonly keeper: { readonly speed: number; readonly radius: number; readonly maxHealth: number; readonly contactCooldown: number };
  readonly crawler: { readonly speed: number; readonly radius: number; readonly maxHealth: number; readonly contactDamage: number; readonly initial: { readonly x: number; readonly y: number } };
  readonly spark: { readonly damage: number; readonly cadence: number; readonly speed: number; readonly lifetime: number; readonly radius: number };
  readonly round: {
    readonly duration: number;
    readonly ordinaryCap: number;
    readonly entryWarning: number;
    readonly entryInset: number;
    readonly entryMinDistance: number;
    readonly edgeDivisions: number;
    readonly phases: readonly { readonly start: number; readonly interval: number }[];
  };
  readonly presentation: {
    readonly margin: number;
    readonly hitFlash: number;
    readonly defeatEffect: number;
    readonly shotFlash: number;
    readonly palette: { readonly background: string; readonly floor: string; readonly boundary: string; readonly light: string };
  };
}

export const clearing = {
  arena: { width: 960, height: 640 },
  keeper: { speed: 150, radius: 10, maxHealth: 100, contactCooldown: 0.7 },
  crawler: { speed: 45, radius: 11, maxHealth: 20, contactDamage: 10, initial: { x: 640, y: 320 } },
  spark: { damage: 10, cadence: 0.7, speed: 300, lifetime: 3, radius: 4 },
  round: {
    duration: 180, ordinaryCap: 60, entryWarning: 0.7, entryInset: 24,
    entryMinDistance: 160, edgeDivisions: 10,
    phases: [{ start: 0, interval: 1 }, { start: 60, interval: 0.65 }, { start: 120, interval: 0.4 }],
  },
  presentation: {
    margin: 48, hitFlash: 0.16, defeatEffect: 0.35, shotFlash: 0.1,
    palette: { background: '#101c1c', floor: '#203a33', boundary: '#69806b', light: '#f5d58b' },
  },
} as const satisfies ClearingContent;
