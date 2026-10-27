/** Gameplay geometry is authored in world units, independently of any artwork. */
export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export interface Mote { readonly x: number; readonly y: number }
export interface Level {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly start: { readonly x: number; readonly y: number };
  readonly solids: readonly Rect[];
  readonly hazards: readonly Rect[];
  readonly motes: readonly Mote[];
  readonly goal: Rect;
}
export const movement = {
  width: 26, height: 40, speed: 300, acceleration: 2400, braking: 3000,
  airAcceleration: 1700, gravity: 2000, jumpSpeed: 720, jumpCut: 0.45,
  maxFall: 900, coyote: 0.1, buffer: 0.12,
} as const;

export const hollow: Level = {
  name: 'The Waking Aqueduct', width: 4480, height: 960,
  start: { x: 110, y: 650 },
  solids: [
    { x: 0, y: 690, w: 650, h: 330 },
    { x: 420, y: 610, w: 110, h: 80 },
    { x: 685, y: 612, w: 80, h: 28 },
    { x: 810, y: 690, w: 530, h: 330 },
    { x: 970, y: 610, w: 150, h: 80 },
    { x: 1150, y: 530, w: 170, h: 160 },
    { x: 1410, y: 535, w: 130, h: 28 },
    { x: 1590, y: 690, w: 760, h: 330 },
    { x: 1660, y: 590, w: 160, h: 28 },
    { x: 2010, y: 590, w: 130, h: 28 },
    { x: 2380, y: 610, w: 130, h: 30 },
    { x: 2590, y: 540, w: 130, h: 30 },
    { x: 2770, y: 650, w: 410, h: 370 },
    { x: 3240, y: 570, w: 150, h: 30 },
    { x: 3450, y: 490, w: 150, h: 30 },
    { x: 3630, y: 610, w: 850, h: 410 },
    { x: 3730, y: 530, w: 160, h: 80 },
    { x: 3940, y: 450, w: 150, h: 28 },
  ],
  hazards: [
    { x: 1900, y: 674, w: 90, h: 16 },
    { x: 2930, y: 634, w: 90, h: 16 },
  ],
  motes: [
    { x: 475, y: 570 }, { x: 725, y: 568 }, { x: 1045, y: 565 },
    { x: 1235, y: 485 }, { x: 1475, y: 490 }, { x: 1740, y: 548 },
    { x: 2080, y: 548 }, { x: 2445, y: 565 }, { x: 2655, y: 495 },
    { x: 3315, y: 525 }, { x: 3525, y: 445 }, { x: 4015, y: 405 },
  ],
  goal: { x: 4280, y: 490, w: 70, h: 120 },
};
