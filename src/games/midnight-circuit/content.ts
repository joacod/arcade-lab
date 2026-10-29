export type EnemyKind = 'striker' | 'bruiser' | 'warden';
export type AttackKind = 'jab' | 'cross' | 'finisher' | 'heavy' | 'air' | 'strike' | 'smash' | 'charge' | 'quake';
export interface AttackDefinition {
  startup: number; active: number; recovery: number; reach: number; lane: number;
  damage: number; knockback: number; stun: number;
}
// All distances are authored world units, independent of the painted silhouettes.
export const attacks: Readonly<Record<AttackKind, AttackDefinition>> = {
  jab:      { startup: .065, active: .09, recovery: .16, reach: 68, lane: 26, damage: 15, knockback: 55, stun: .27 },
  cross:    { startup: .09, active: .10, recovery: .18, reach: 78, lane: 28, damage: 19, knockback: 75, stun: .32 },
  finisher: { startup: .13, active: .13, recovery: .24, reach: 100, lane: 32, damage: 30, knockback: 285, stun: .62 },
  heavy:    { startup: .28, active: .16, recovery: .36, reach: 112, lane: 46, damage: 38, knockback: 350, stun: .78 },
  air:      { startup: .08, active: .22, recovery: .19, reach: 99, lane: 32, damage: 25, knockback: 230, stun: .5 },
  strike:   { startup: .46, active: .12, recovery: .45, reach: 61, lane: 23, damage: 9, knockback: 120, stun: .28 },
  smash:    { startup: .78, active: .17, recovery: .72, reach: 88, lane: 32, damage: 17, knockback: 235, stun: .44 },
  charge:   { startup: .92, active: .57, recovery: .98, reach: 76, lane: 28, damage: 21, knockback: 280, stun: .48 },
  quake:    { startup: 1.08, active: .18, recovery: 1.15, reach: 180, lane: 87, damage: 23, knockback: 250, stun: .48 },
};
export const fighter = { health: 100, lives: 3, speed: 225, laneSpeed: 147, radius: 17, jump: 465, gravity: 1100, immunity: .85 } as const;
export const chargeSpeed = 490;
export const enemies: Readonly<Record<EnemyKind, { health: number; speed: number; laneSpeed: number; radius: number; points: number }>> = {
  striker: { health: 68, speed: 136, laneSpeed: 98, radius: 17, points: 180 },
  bruiser: { health: 148, speed: 84, laneSpeed: 68, radius: 24, points: 350 },
  warden: { health: 720, speed: 90, laneSpeed: 70, radius: 31, points: 2400 },
};
export interface Spawn { kind: EnemyKind; x: number; lane: number }
export interface Encounter { name: string; trigger: number; left: number; right: number; waves: readonly (readonly Spawn[])[]; repair: number }
export interface Stage {
  name: string; subtitle: string; environment: 'street' | 'station'; width: number;
  laneMin: number; laneMax: number; start: { x: number; lane: number }; encounters: readonly Encounter[];
  pickups: readonly { x: number; lane: number; health: number }[];
}
const spawn = (kind: EnemyKind, x: number, lane: number): Spawn => ({ kind, x, lane });
export const stages: readonly Stage[] = [
  { name: 'Neon Backstreets', subtitle: 'Follow the dead grid east.', environment: 'street', width: 3300,
    laneMin: 0, laneMax: 180, start: { x: 130, lane: 100 }, pickups: [{ x: 1960, lane: 35, health: 30 }], encounters: [
      { name: 'Last train home', trigger: 360, left: 200, right: 1000, repair: 18, waves: [
        [spawn('striker', 670, 95), spawn('striker', 830, 35)],
        [spawn('striker', 380, 145), spawn('striker', 870, 75)],
      ] },
      { name: 'Under the overpass', trigger: 1370, left: 1210, right: 2010, repair: 22, waves: [
        [spawn('bruiser', 1770, 110), spawn('striker', 1590, 25), spawn('striker', 1910, 155)],
        [spawn('striker', 1370, 35), spawn('bruiser', 1810, 145)],
      ] },
      { name: 'No way around', trigger: 2380, left: 2220, right: 3020, repair: 25, waves: [
        [spawn('bruiser', 2740, 45), spawn('striker', 2880, 140), spawn('striker', 2470, 165)],
        [spawn('striker', 2400, 45), spawn('bruiser', 2820, 100), spawn('striker', 2930, 175)],
        [spawn('bruiser', 2400, 145), spawn('striker', 2810, 40), spawn('striker', 2910, 115)],
      ] },
    ] },
  { name: 'The Power Station', subtitle: 'One last circuit. Bring back the light.', environment: 'station', width: 3300,
    laneMin: 0, laneMax: 180, start: { x: 130, lane: 100 }, pickups: [{ x: 2070, lane: 150, health: 35 }], encounters: [
      { name: 'Restricted access', trigger: 360, left: 200, right: 1000, repair: 22, waves: [
        [spawn('striker', 670, 30), spawn('bruiser', 870, 130), spawn('striker', 780, 180)],
        [spawn('bruiser', 380, 45), spawn('striker', 850, 100), spawn('striker', 930, 160)],
        [spawn('striker', 400, 160), spawn('bruiser', 780, 40), spawn('bruiser', 910, 130)],
      ] },
      { name: 'The last shift', trigger: 1370, left: 1210, right: 2010, repair: 28, waves: [
        [spawn('bruiser', 1710, 40), spawn('bruiser', 1890, 155), spawn('striker', 1510, 100)],
        [spawn('striker', 1370, 150), spawn('bruiser', 1830, 100), spawn('striker', 1940, 30)],
        [spawn('bruiser', 1380, 35), spawn('striker', 1770, 160), spawn('bruiser', 1920, 75)],
      ] },
      { name: 'Circuit Warden', trigger: 2380, left: 2220, right: 3020, repair: 0, waves: [
        [spawn('warden', 2820, 95)],
      ] },
    ] },
];
