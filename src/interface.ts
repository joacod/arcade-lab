export const interfaceSkins = { classic: 'Classic', rune: 'Rune', glass: 'Glass', abyss: 'Abyss' } as const;
export type InterfaceSkin = keyof typeof interfaceSkins;
export type InterfaceChoice = 'match' | InterfaceSkin;
export const accents = { default: 'Default', amber: 'Amber', teal: 'Teal', violet: 'Violet' } as const;
export type Accent = keyof typeof accents;
export function resolvedSkin(choice: InterfaceChoice, defaultSkin: InterfaceSkin): InterfaceSkin {
  return choice === 'match' ? defaultSkin : choice;
}
