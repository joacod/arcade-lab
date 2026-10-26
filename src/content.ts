interface ClearingContent {
  readonly arena: { readonly width: number; readonly height: number };
  readonly keeper: { readonly speed: number; readonly radius: number };
  readonly presentation: {
    readonly margin: number;
    readonly palette: {
      readonly background: string;
      readonly floor: string;
      readonly boundary: string;
      readonly light: string;
    };
  };
}

export const clearing = {
  arena: { width: 960, height: 640 },
  keeper: { speed: 150, radius: 10 },
  presentation: {
    margin: 48,
    palette: {
      background: '#101c1c',
      floor: '#203a33',
      boundary: '#69806b',
      light: '#f5d58b',
    },
  },
} as const satisfies ClearingContent;
