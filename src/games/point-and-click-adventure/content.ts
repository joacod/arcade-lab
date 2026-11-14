/** Story definitions are independent of browser, artwork and audio. */
export type RoomId = 'hall' | 'gallery' | 'library' | 'kitchen' | 'bell';
export interface Point { x: number; y: number }
export interface Floor { x: number; y: number; w: number; h: number }
export interface RoomDefinition { name: string; floor: readonly Floor[]; entry: Point }
const floor = [{ x: 45, y: 365, w: 870, h: 140 }];
export const rooms: Record<RoomId, RoomDefinition> = {
  hall: { name: 'Great Hall', floor, entry: { x: 475, y: 460 } },
  gallery: { name: 'Portrait Gallery', floor, entry: { x: 110, y: 460 } },
  library: { name: 'Library', floor, entry: { x: 110, y: 460 } },
  kitchen: { name: 'Servants’ Kitchen', floor, entry: { x: 110, y: 460 } },
  bell: { name: 'Bell Chamber', floor, entry: { x: 110, y: 460 } },
};
export const itemIds = ['lens', 'lantern', 'bellows', 'fork', 'chalk', 'brush', 'poker', 'longBrush', 'cabinetKey', 'windingKey'] as const;
export type ItemId = typeof itemIds[number];
export const items: Record<ItemId, { name: string; description: string; symbol: string }> = {
  lens: { name: 'Magnifying glass', symbol: '◉', description: 'An ordinary lens. Excellent for physical clues; refreshingly unimpressed by spirits.' },
  lantern: { name: 'Spirit lantern', symbol: '▣', description: 'Raking light reveals spirits and impressions. For a loose spirit: use the bellows, close the shutter, then sound the fork. Holds one presence.' },
  bellows: { name: 'Hand bellows', symbol: '≋', description: 'Attached to the lantern’s intake. Draws in loose or weakened spirits. Strong, anchored ghosts will merely be offended.' },
  fork: { name: 'Tuning fork', symbol: '♮', description: 'Seals a spirit only after the lantern shutter is closed. No ear for music required.' },
  chalk: { name: 'Ward chalk', symbol: '╱', description: 'Enough chalk to repair a ward. Wren refuses to economize on the one part of his profession that works.' },
  brush: { name: 'Cleaning brush', symbol: '▥', description: 'A detachable brush head with a short handle and a threaded socket. The kitchen tube is beyond its reach.' },
  poker: { name: 'Fireplace poker', symbol: '⌐', description: 'Long, narrow, with a threaded end. It reaches the service tube, but cannot sweep away the blockage.' },
  longBrush: { name: 'Extended brush', symbol: '⚒', description: 'Brush fitted to poker. Considerable reach, absolutely no prestige.' },
  cabinetKey: { name: 'Household key', symbol: '⚿', description: 'Evelyn’s key to the kitchen cabinet. Borrowed with permission, an unusual development.' },
  windingKey: { name: 'Winding key', symbol: '⚙', description: 'The square socket fits the family music box.' },
};
export const factIds = ['introduced', 'whisperLit', 'tutorial', 'released', 'vent', 'mark', 'tubeOpen', 'mechanism', 'disabled', 'cabinetOpen', 'music', 'photoLit', 'testimony', 'record', 'voice', 'fraud', 'guardians', 'confronted', 'chain', 'ward', 'mirror', 'finished'] as const;
export type Fact = typeof factIds[number];
export const evidence = {
  vent: { name: 'A draft behind the scream', text: 'The portrait’s scream moves soot and bends the candle flame away from its grille.', source: 'Portrait vent · physical observation' },
  mechanism: { name: 'A manufactured scream', text: 'Testing the new bellows and reed reproduces the portrait scream through the service tube.', source: 'Kitchen mechanism · experiment' },
  mark: { name: 'Vale’s restoration mark', text: 'The mark on Vale’s crate matches the newly installed mechanism. This links the work, not yet its intent.', source: 'Restoration crate · physical observation' },
  record: { name: 'The keeper’s account', text: 'The household ward keeps the Thirteenth Guest inside. Restore chain, chalk boundary and inward mirror. The bell housing secures a captured Guest.', source: 'Keeper’s journal and engraving · document' },
  testimony: { name: 'Brindle remembers', text: 'Brindle and Oswald guarded the bell. Vale loosened its restraint, and the household drove him away.', source: 'Mrs. Brindle · testimony' },
  voice: { name: 'A voice without its owner', text: 'Vale’s reassurance echoed upstairs while he stood silent below.', source: 'Great Hall · observation' },
} as const;
export type EvidenceId = keyof typeof evidence;
export const deductions = {
  fraud: { name: 'The portrait scare is manufactured', requires: ['vent', 'mechanism'] as readonly EvidenceId[] },
  guardians: { name: 'The household ghosts guard a prison', requires: ['record', 'testimony'] as readonly EvidenceId[] },
} as const;
export type DeductionId = keyof typeof deductions;
export interface TargetDefinition { room: RoomId; name: string; x: number; y: number; w: number; h: number; at: Point; kind: 'person' | 'ghost' | 'prop' | 'exit'; action: string; verb: 'inspect' | 'interact'; description: string; destination?: RoomId }
function prop(room: RoomId, name: string, x: number, y: number, w: number, h: number, action: string, description: string, kind: TargetDefinition['kind'] = 'prop', verb: TargetDefinition['verb'] = 'interact'): TargetDefinition {
  return { room, name, x, y, w, h, at: { x: x + w / 2, y: 405 }, kind, action, verb, description };
}
function exit(room: RoomId, destination: RoomId, x: number): TargetDefinition {
  return { ...prop(room, rooms[destination].name, x, 245, 64, 145, 'Enter', `A passage to the ${rooms[destination].name.toLowerCase()}.`, 'exit'), destination };
}
export const targets = {
  evelyn: prop('hall', 'Lady Evelyn', 205, 245, 65, 145, 'Talk', 'A practical woman regarding a very impractical inheritance.', 'person'),
  vale: prop('hall', 'Professor Vale', 610, 240, 65, 150, 'Talk', 'An antiquarian with polished boots and remarkably unpolished explanations.', 'person'),
  crate: prop('hall', 'Restoration crate', 700, 320, 110, 70, 'Examine', 'New brass fittings. Each bears Vale’s distinctive V inside a diamond.', 'prop', 'inspect'),
  whisper: prop('hall', 'Loose whisper', 390, 205, 85, 110, 'Listen', 'Something small and ill-mannered circles the chandelier.', 'ghost'),
  hallGallery: exit('hall', 'gallery', 855), hallLibrary: exit('hall', 'library', 55),
  portrait: prop('gallery', 'Screaming portrait', 210, 135, 120, 155, 'Inspect vent', 'An ancestor with excellent lungs. Soot shifts at the grille whenever he screams.', 'prop', 'inspect'),
  oswald: prop('gallery', 'Sir Oswald', 600, 230, 90, 165, 'Talk', 'A headless knight holding his head. The heavy chain runs toward the bell door.', 'ghost'),
  emptyFrame: prop('gallery', 'Empty portrait', 420, 170, 100, 125, 'Examine', 'An empty silver-lined frame. A small household echo could make itself at home.', 'prop', 'inspect'),
  bellDoor: exit('gallery', 'bell', 850), galleryHall: exit('gallery', 'hall', 55),
  galleryKitchen: { ...exit('gallery', 'kitchen', 740), name: 'Kitchen passage' },
  journal: prop('library', 'Keeper’s journal', 250, 330, 120, 55, 'Read', 'Beside a ward engraving: spirits face inward around a chained bell. Its caption says CONTAINMENT, not summoning.', 'prop', 'inspect'),
  musicBox: prop('library', 'Music box', 440, 330, 85, 60, 'Examine', 'A few notes, then silence. Its square winding socket is empty. Brindle fades with the tune.', 'prop', 'inspect'),
  photo: prop('library', 'Family photograph', 650, 195, 95, 105, 'Examine', 'The household in happier days. Brindle’s gloved hand rests beside the familiar music box.', 'prop', 'inspect'),
  brindle: prop('library', 'Mrs. Brindle', 560, 240, 70, 155, 'Talk', 'The housekeeper’s silhouette flickers whenever the music stops.', 'ghost'),
  libraryHall: exit('library', 'hall', 55), libraryKitchen: exit('library', 'kitchen', 855),
  brush: prop('kitchen', 'Cleaning brush', 250, 330, 70, 45, 'Take', items.brush.description),
  poker: prop('kitchen', 'Fireplace poker', 380, 260, 35, 120, 'Take', items.poker.description),
  tube: prop('kitchen', 'Service tube', 505, 160, 110, 135, 'Inspect', 'A maintenance cover sits deep behind a soot-clogged tube. A plan connects it to the portrait grille.'),
  cabinet: prop('kitchen', 'Household cabinet', 690, 235, 115, 150, 'Open', 'A winding key hangs behind the locked glass. Evelyn may have the household key.'),
  kitchenLibrary: exit('kitchen', 'library', 55), kitchenGallery: exit('kitchen', 'gallery', 855),
  chain: prop('bell', 'Loose chain', 240, 270, 65, 125, 'Attach chain', 'The chain has slipped free of its marked anchor. Oswald was trying to put it back.'),
  ward: prop('bell', 'Broken ward line', 350, 370, 135, 25, 'Examine', 'A clean gap interrupts the chalk boundary. The keeper’s diagram shows a continuous line.', 'prop', 'inspect'),
  mirror: prop('bell', 'Ward mirror', 680, 195, 90, 155, 'Turn inward', 'The mirror faces the window. The engraving places its reflection toward the bell.'),
  guest: prop('bell', 'Thirteenth Guest', 470, 155, 120, 175, 'Address', 'A borrowed face shifts inside the bell’s broken silver housing.', 'ghost'),
  housing: prop('bell', 'Bell housing', 445, 90, 170, 260, 'Secure lantern', 'A silver-lined recess and latch, made to secure a spirit vessel inside the repaired ward.'),
  bellGallery: exit('bell', 'gallery', 55),
} satisfies Record<string, TargetDefinition>;
export type TargetId = keyof typeof targets;
export const targetIds = Object.keys(targets) as TargetId[];
export const getTarget = (id: TargetId): TargetDefinition => targets[id];
export interface Line { speaker: string; text: string }
export const scenes = {
  intro: [
    { speaker: 'Blackthorn Castle · 1889', text: 'The carriage leaves. The castle bell strikes twelve… and draws breath for one more.' },
    { speaker: 'Vale', text: 'Mr. Wren. Clear this house of its violent spirits. Particularly the knight at the bell door. Before thirteen.' },
    { speaker: 'Wren', text: 'That groan is merely wind in a loose pipe.' },
    { speaker: 'A voice at the window', text: 'Then kindly close it. Some of us are trying to be dead.' },
    { speaker: 'Wren', text: 'A loose whisper. Hardly the violent haunting I was promised.' },
  ],
  testimony: [
    { speaker: 'Brindle', text: 'That melody. Evelyn used to hide here when the storms came. Keep your light on the photograph, please. It helps me remember myself.' },
    { speaker: 'Wren', text: 'What happened at the bell?' },
    { speaker: 'Brindle', text: 'We kept the Thirteenth Guest INSIDE. Oswald’s chain was a restraint. Vale loosened it. We drove him back before he could free it.' },
    { speaker: 'Brindle', text: 'Read the keeper’s journal. Chain, boundary, inward mirror. We were the guards, Mr. Wren. Whoever hired you knows that.' },
  ],
  confrontation: [
    { speaker: 'Wren', text: 'The portrait is connected to your new bellows, Professor. The spirits are keeping something imprisoned. You hired me to remove its guards.' },
    { speaker: 'Vale', text: 'I manufactured a few disturbances. The Guest promised me command of the dead. Imagine the people who would pay to speak to them!' },
    { speaker: 'Vale’s voice · upstairs', text: 'I assure you, there is a perfectly rational explanation.' },
    { speaker: 'Wren', text: 'Then tell me what color coat I am wearing.' },
    { speaker: 'Vale’s voice · upstairs', text: 'I assure you, there is a perfectly rational explanation.' },
    { speaker: 'Oswald', text: 'It is rehearsing him. It means to leave wearing his identity. Come. Restore the chain, chalk boundary and inward mirror. Then your little lantern may stand a chance.' },
  ],
  ending: [
    { speaker: 'The great bell', text: 'Twelve strokes. This time, it stops.' },
    { speaker: 'Evelyn', text: 'The household may, of course, remain.' },
    { speaker: 'Brindle', text: 'How generous. We had not intended to ask.' },
    { speaker: 'Wren', text: 'One haunting investigated. One haunting preserved. One guest removed. I shall send the invoice.' },
    { speaker: 'The whisper, in its portrait', text: 'Do you take apprentices?' },
  ],
} satisfies Record<string, readonly Line[]>;
export type SceneId = keyof typeof scenes;
