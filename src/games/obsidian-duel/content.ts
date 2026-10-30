export type FighterId = 'nera' | 'kael';
export type AttackKind = 'light' | 'heavy' | 'sweep' | 'air' | 'special';
export type Height = 'mid' | 'low' | 'overhead';
export interface AttackDefinition {
  name: string; startup: number; active: number; recovery: number; reach: number;
  damage: number; height: Height; minZ: number; maxZ: number; stun: number; push: number; knockdown: boolean; advance: number;
}
export interface FighterDefinition {
  name: string; title: string; speed: number; jump: number; cooldown: number;
  attacks: Readonly<Record<AttackKind, AttackDefinition>>;
}
const strike = (name: string, startup: number, active: number, recovery: number, reach: number, damage: number,
  extra: Partial<AttackDefinition> = {}): AttackDefinition => ({ name, startup, active, recovery, reach, damage,
  height: 'mid', minZ: 0, maxZ: 125, stun: .19, push: 115, knockdown: false, advance: 0, ...extra });
export const arena = { width: 1000, height: 560, floor: 440, left: 84, right: 916, radius: 27, pushHeight: 80, gravity: 1600, roundTime: 75 } as const;
export const fighters: Readonly<Record<FighterId, FighterDefinition>> = {
  nera: { name: 'Nera', title: 'THE STORMWEAVER', speed: 260, jump: 660, cooldown: 1.65, attacks: {
    light: strike('Gale palm', .09, .075, .20, 91, 7),
    heavy: strike('Crescent heel', .25, .10, .36, 130, 15, { stun: .26, push: 205 }),
    sweep: strike('Undertow', .21, .10, .34, 112, 10, { height: 'low', maxZ: 24, knockdown: true, push: 200 }),
    air: strike('Falling star', .12, .18, .26, 107, 11, { height: 'overhead', minZ: -125, maxZ: 100, stun: .23, push: 170 }),
    special: strike('Stormglass', .30, .08, .40, 0, 12, { stun: .22, push: 190 }),
  } },
  kael: { name: 'Kael', title: 'THE CITADEL FIST', speed: 210, jump: 610, cooldown: 2.0, attacks: {
    light: strike('Iron hand', .13, .085, .24, 100, 9),
    heavy: strike('Obsidian hammer', .34, .12, .48, 139, 20, { stun: .28, push: 245 }),
    sweep: strike('Fault line', .26, .11, .43, 120, 13, { height: 'low', maxZ: 24, knockdown: true, push: 215 }),
    air: strike('Falling bastion', .16, .18, .32, 116, 14, { height: 'overhead', minZ: -125, maxZ: 110, stun: .25, push: 190 }),
    special: strike('Riftbreaker', .42, .21, .57, 118, 23, { advance: 620, stun: .28, push: 310, knockdown: true }),
  } },
};
