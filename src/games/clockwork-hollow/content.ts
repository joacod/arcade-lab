/** Gameplay geometry is authored in world units, independently of any artwork. */
export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export interface Mote { readonly x: number; readonly y: number }
export interface Patrol extends Rect { readonly to: number; readonly speed: number }
export interface Vent extends Rect { readonly period: number; readonly offset: number }
export interface Checkpoint { readonly x: number; readonly y: number; readonly name: string }
export interface Sign { readonly x: number; readonly y: number; readonly title: string; readonly detail: string }
export type LevelId = 'aqueduct' | 'emberworks' | 'belfry';
export interface Level {
  readonly id: LevelId;
  readonly name: string;
  readonly subtitle: string;
  readonly checkpoints: readonly Checkpoint[];
  readonly patrols: readonly Patrol[];
  readonly vents: readonly Vent[];
  readonly signs: readonly Sign[];
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
  name: 'The Waking Aqueduct', id: 'aqueduct', subtitle: 'Follow the water. Find your spring.',
  checkpoints: [{ x: 3690, y: 570, name: 'Moss lantern' }, { x: 8100, y: 610, name: 'Waterwheel rest' }],
  patrols: [{ x: 4490, y: 624, w: 36, h: 26, to: 4800, speed: 62 }, { x: 10300, y: 624, w: 36, h: 26, to: 10600, speed: 76 }],
  vents: [],
  signs: [{ x: 205, y: 618, title: 'THE BELL IS EAST →', detail: 'HOLD JUMP FOR HEIGHT' },
    { x: 3750, y: 538, title: 'A LIGHT TO RETURN TO', detail: 'TOUCH LANTERNS TO SAVE' },
    { x: 4260, y: 560, title: 'WIND-UP BEETLES →', detail: 'LAND ON TOP OR LEAP OVER' },
    { x: 8150, y: 578, title: 'THE WATERWHEEL →', detail: 'MOTES REWARD EXPLORING' }],
  width: 12500, height: 960,
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
    { x: 3630, y: 610, w: 550, h: 410 },
    { x: 3730, y: 530, w: 160, h: 80 },
    { x: 3940, y: 450, w: 150, h: 28 },
    // Beetle meadow: a safe introduction, then a split bridge.
    { x: 4250, y: 650, w: 800, h: 370 },
    { x: 5120, y: 580, w: 160, h: 28 }, { x: 5380, y: 510, w: 160, h: 28 },
    { x: 5630, y: 610, w: 650, h: 410 }, { x: 5890, y: 530, w: 150, h: 80 },
    // A rising spillway followed by descending stepping stones.
    { x: 6360, y: 540, w: 160, h: 28 }, { x: 6620, y: 460, w: 160, h: 28 },
    { x: 6880, y: 380, w: 220, h: 28 }, { x: 7190, y: 460, w: 150, h: 28 },
    { x: 7430, y: 550, w: 170, h: 28 }, { x: 7690, y: 650, w: 850, h: 370 },
    // The last span mixes low thorns with generous recovery islands.
    { x: 8610, y: 570, w: 180, h: 28 }, { x: 8890, y: 500, w: 180, h: 28 },
    { x: 9170, y: 620, w: 720, h: 400 }, { x: 9370, y: 540, w: 150, h: 80 },
    { x: 9970, y: 550, w: 160, h: 28 }, { x: 10210, y: 650, w: 650, h: 370 },
    { x: 10930, y: 570, w: 160, h: 28 }, { x: 11190, y: 490, w: 180, h: 28 },
    { x: 11460, y: 600, w: 1040, h: 420 }, { x: 11700, y: 520, w: 160, h: 80 },
  ],
  hazards: [
    { x: 1900, y: 674, w: 90, h: 16 },
    { x: 2930, y: 634, w: 90, h: 16 },
    { x: 6120, y: 594, w: 85, h: 16 }, { x: 7830, y: 634, w: 80, h: 16 },
    { x: 9610, y: 604, w: 95, h: 16 }, { x: 11950, y: 584, w: 80, h: 16 },
  ],
  motes: [
    { x: 475, y: 570 }, { x: 725, y: 568 }, { x: 1045, y: 565 },
    { x: 1235, y: 485 }, { x: 1475, y: 490 }, { x: 1740, y: 548 },
    { x: 2080, y: 548 }, { x: 2445, y: 565 }, { x: 2655, y: 495 },
    { x: 3315, y: 525 }, { x: 3525, y: 445 }, { x: 4015, y: 405 },
    { x: 5210, y: 535 }, { x: 5460, y: 465 }, { x: 5965, y: 485 },
    { x: 6700, y: 415 }, { x: 6990, y: 335 }, { x: 7520, y: 505 },
    { x: 8700, y: 525 }, { x: 8980, y: 455 }, { x: 9445, y: 495 },
    { x: 10050, y: 505 }, { x: 11280, y: 445 }, { x: 11780, y: 475 },
  ],
  goal: { x: 12300, y: 480, w: 70, h: 120 },
};


/** Individually authored routes: geometry and timing are content, never generated. */
export const furnace: Level = {
  name: 'The Emberworks', id: 'emberworks', subtitle: 'Read the pressure. Cross between breaths.', width: 13600, height: 1000,
  start: { x: 110, y: 650 },
  checkpoints: [{ x: 4350, y: 610, name: 'Foundry lantern' }, { x: 9000, y: 570, name: 'Pressure room' }],
  signs: [{ x: 230, y: 618, title: 'THE EMBERWORKS →', detail: 'VENTS GLOW BEFORE FIRING' },
    { x: 4370, y: 578, title: 'BREATHE. THEN CROSS.', detail: 'WAIT FOR THE BLUE LIGHT' },
    { x: 9030, y: 538, title: 'THE PRESSURE ROOM →', detail: 'ONE CLEAN JUMP AT A TIME' }],
  solids: [
    { x: 0, y: 690, w: 1100, h: 370 }, { x: 1200, y: 610, w: 180, h: 28 },
    { x: 1480, y: 530, w: 180, h: 28 }, { x: 1770, y: 650, w: 1050, h: 410 },
    { x: 2160, y: 570, w: 150, h: 80 }, { x: 2900, y: 570, w: 170, h: 28 },
    { x: 3170, y: 490, w: 170, h: 28 }, { x: 3440, y: 410, w: 200, h: 28 },
    { x: 3750, y: 500, w: 160, h: 28 }, { x: 4020, y: 650, w: 1120, h: 410 },
    // Two vents share a long safe apron; upper ledges reward a longer detour.
    { x: 4630, y: 550, w: 150, h: 28 }, { x: 4890, y: 470, w: 150, h: 28 },
    { x: 5230, y: 570, w: 170, h: 28 }, { x: 5510, y: 490, w: 180, h: 28 },
    { x: 5800, y: 620, w: 1150, h: 440 }, { x: 6040, y: 540, w: 160, h: 80 },
    { x: 7050, y: 540, w: 170, h: 28 }, { x: 7330, y: 460, w: 170, h: 28 },
    { x: 7610, y: 380, w: 210, h: 28 }, { x: 7920, y: 470, w: 170, h: 28 },
    { x: 8200, y: 550, w: 160, h: 28 }, { x: 8460, y: 610, w: 1250, h: 450 },
    { x: 9810, y: 530, w: 180, h: 28 }, { x: 10100, y: 450, w: 180, h: 28 },
    { x: 10390, y: 600, w: 1150, h: 460 }, { x: 10700, y: 520, w: 160, h: 80 },
    { x: 11630, y: 520, w: 170, h: 28 }, { x: 11910, y: 440, w: 190, h: 28 },
    { x: 12210, y: 580, w: 1390, h: 480 }, { x: 12500, y: 500, w: 170, h: 80 },
  ],
  hazards: [{ x: 2470, y: 634, w: 100, h: 16 }, { x: 6660, y: 604, w: 100, h: 16 },
    { x: 11030, y: 584, w: 110, h: 16 }, { x: 12960, y: 564, w: 100, h: 16 }],
  patrols: [{ x: 1840, y: 624, w: 36, h: 26, to: 2070, speed: 80 },
    { x: 6300, y: 594, w: 36, h: 26, to: 6520, speed: 88 },
    { x: 12300, y: 554, w: 36, h: 26, to: 12440, speed: 90 }],
  vents: [{ x: 700, y: 535, w: 64, h: 155, period: 3.8, offset: 0 },
    { x: 4530, y: 495, w: 64, h: 155, period: 3.6, offset: 0.9 },
    { x: 4990, y: 495, w: 64, h: 155, period: 3.6, offset: 2.2 },
    { x: 9270, y: 455, w: 64, h: 155, period: 3.2, offset: 1 },
    { x: 11310, y: 445, w: 64, h: 155, period: 3.2, offset: 0.5 },
    { x: 13200, y: 425, w: 64, h: 155, period: 3.2, offset: 1.7 }],
  motes: [{ x: 1290, y: 565 }, { x: 1570, y: 485 }, { x: 2235, y: 525 },
    { x: 3260, y: 445 }, { x: 3540, y: 365 }, { x: 4705, y: 505 }, { x: 4965, y: 425 },
    { x: 5320, y: 525 }, { x: 5600, y: 445 }, { x: 6120, y: 495 },
    { x: 7420, y: 415 }, { x: 7715, y: 335 }, { x: 8280, y: 505 },
    { x: 9900, y: 485 }, { x: 10190, y: 405 }, { x: 10780, y: 475 },
    { x: 11715, y: 475 }, { x: 12005, y: 395 }, { x: 12585, y: 455 }],
  goal: { x: 13400, y: 460, w: 70, h: 120 },
};
export const belfry: Level = {
  name: 'The Starlit Belfry', id: 'belfry', subtitle: 'One last climb. Let the hollow sing.', width: 14400, height: 1100,
  start: { x: 110, y: 650 },
  checkpoints: [{ x: 4570, y: 570, name: 'Moon lantern' }, { x: 9400, y: 530, name: 'Bellkeeper rest' }],
  signs: [{ x: 210, y: 618, title: 'THE STARLIT BELFRY →', detail: 'EVERY SPRING HAS A SONG' },
    { x: 4620, y: 538, title: 'ABOVE THE CANOPY →', detail: 'WATCH THE LANDING EDGE' },
    { x: 9440, y: 498, title: 'THE LAST ASCENT →', detail: 'THE HOLLOW IS LISTENING' }],
  solids: [
    { x: 0, y: 690, w: 760, h: 470 }, { x: 850, y: 610, w: 160, h: 28 },
    { x: 1110, y: 530, w: 160, h: 28 }, { x: 1370, y: 450, w: 180, h: 28 },
    { x: 1660, y: 570, w: 1000, h: 590 }, { x: 1910, y: 490, w: 150, h: 80 },
    { x: 2760, y: 490, w: 150, h: 28 }, { x: 3010, y: 410, w: 150, h: 28 },
    { x: 3260, y: 330, w: 200, h: 28 }, { x: 3570, y: 420, w: 150, h: 28 },
    { x: 3830, y: 510, w: 160, h: 28 }, { x: 4100, y: 610, w: 1200, h: 550 },
    { x: 5400, y: 530, w: 150, h: 28 }, { x: 5650, y: 450, w: 150, h: 28 },
    { x: 5910, y: 370, w: 190, h: 28 }, { x: 6220, y: 490, w: 1100, h: 670 },
    { x: 6520, y: 410, w: 160, h: 80 }, { x: 7420, y: 410, w: 150, h: 28 },
    { x: 7680, y: 330, w: 150, h: 28 }, { x: 7940, y: 250, w: 200, h: 28 },
    { x: 8250, y: 340, w: 150, h: 28 }, { x: 8510, y: 430, w: 160, h: 28 },
    { x: 8780, y: 570, w: 1320, h: 590 }, { x: 10200, y: 490, w: 150, h: 28 },
    { x: 10460, y: 410, w: 150, h: 28 }, { x: 10720, y: 330, w: 190, h: 28 },
    { x: 11030, y: 460, w: 1000, h: 700 }, { x: 11320, y: 380, w: 150, h: 80 },
    { x: 12130, y: 380, w: 160, h: 28 }, { x: 12400, y: 300, w: 170, h: 28 },
    { x: 12680, y: 220, w: 210, h: 28 }, { x: 13000, y: 310, w: 170, h: 28 },
    { x: 13280, y: 400, w: 1120, h: 760 },
  ],
  hazards: [{ x: 2420, y: 554, w: 110, h: 16 }, { x: 7010, y: 474, w: 110, h: 16 },
    { x: 11720, y: 444, w: 110, h: 16 }],
  patrols: [{ x: 2140, y: 544, w: 36, h: 26, to: 2290, speed: 90 },
    { x: 4270, y: 584, w: 36, h: 26, to: 4430, speed: 92 },
    { x: 6280, y: 464, w: 36, h: 26, to: 6430, speed: 100 },
    { x: 11110, y: 434, w: 36, h: 26, to: 11240, speed: 100 }],
  vents: [{ x: 5000, y: 455, w: 64, h: 155, period: 3.1, offset: 0.5 },
    { x: 9650, y: 415, w: 64, h: 155, period: 3, offset: 1.2 },
    { x: 9950, y: 415, w: 64, h: 155, period: 3, offset: 2.4 },
    { x: 13600, y: 245, w: 64, h: 155, period: 2.9, offset: 0.5 }],
  motes: [{ x: 930, y: 565 }, { x: 1190, y: 485 }, { x: 1460, y: 405 }, { x: 1985, y: 445 },
    { x: 2835, y: 445 }, { x: 3085, y: 365 }, { x: 3360, y: 285 }, { x: 3910, y: 465 },
    { x: 5475, y: 485 }, { x: 5725, y: 405 }, { x: 6005, y: 325 }, { x: 6600, y: 365 },
    { x: 7495, y: 365 }, { x: 7755, y: 285 }, { x: 8040, y: 205 }, { x: 8590, y: 385 },
    { x: 10275, y: 445 }, { x: 10535, y: 365 }, { x: 10815, y: 285 }, { x: 11395, y: 335 },
    { x: 12210, y: 335 }, { x: 12485, y: 255 }, { x: 12785, y: 175 }, { x: 13380, y: 355 }],
  goal: { x: 14180, y: 280, w: 70, h: 120 },
};
export const journey: readonly Level[] = [hollow, furnace, belfry];
