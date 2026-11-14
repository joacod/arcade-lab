import { rooms, itemIds, factIds, deductions, type Fact, type RoomId, type Line } from './content.ts';
import { createRun, has, wardReady, type Run } from './game.ts';
import { inside } from './navigation.ts';
export interface Snapshot {
  room: RoomId; actor: { x: number; y: number }; facts: Fact[]; inventory: Run['inventory']; lantern: Run['lantern'];
  status: Run['status']; transcript: Line[]; hintLevels: Record<string, number>;
}
export function snapshot(run: Run): Snapshot {
  if (run.pending || run.dialogue) throw new Error('Save waits for a stable interaction boundary.');
  return structuredClone({ room: run.room, actor: run.actor, facts: run.facts, inventory: run.inventory, lantern: run.lantern,
    status: run.status, transcript: run.transcript, hintLevels: run.hintLevels });
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function oneOf(value: unknown, options: readonly string[]): boolean { return typeof value === 'string' && options.includes(value); }
/** Validate before replacing the active run. No defaults or compatibility aliases. */
export function restore(value: unknown): Run | undefined {
  if (!record(value) || !oneOf(value.room, Object.keys(rooms)) || !record(value.actor) || !Number.isFinite(value.actor.x) || !Number.isFinite(value.actor.y)
    || !Array.isArray(value.facts) || value.facts.length > factIds.length || !value.facts.every(f => oneOf(f, factIds)) || new Set(value.facts).size !== value.facts.length
    || !record(value.inventory) || Object.keys(value.inventory).length !== itemIds.length || !itemIds.every(id => oneOf((value.inventory as Record<string, unknown>)[id], ['inventory', 'world', 'consumed']))
    || !record(value.lantern) || !oneOf(value.lantern.occupant, ['empty', 'whisper', 'guest']) || !oneOf(value.lantern.phase, ['open', 'drawn', 'closed', 'sealed'])
    || !oneOf(value.status, ['active', 'complete']) || !Array.isArray(value.transcript) || value.transcript.length > 80
    || !value.transcript.every(l => record(l) && typeof l.speaker === 'string' && l.speaker.length < 120 && typeof l.text === 'string' && l.text.length < 2000)
    || !record(value.hintLevels) || Object.keys(value.hintLevels).length > 12 || !Object.entries(value.hintLevels).every(([key, n]) => ['whisper', 'fraud', 'guardians', 'confront', 'ward', 'release', 'capture'].includes(key) && Number.isInteger(n) && Number(n) >= 0 && Number(n) < 5)) return;
  const s = value as unknown as Snapshot;
  if (!rooms[s.room].floor.some(floor => inside(s.actor, floor))) return;
  const run = createRun();
  // Only durable fields cross this boundary, even if a save includes runtime-shaped extras.
  Object.assign(run, structuredClone({ room: s.room, actor: s.actor, facts: s.facts, inventory: s.inventory,
    lantern: s.lantern, status: s.status, transcript: s.transcript, hintLevels: s.hintLevels }));
  if ((run.lantern.occupant === 'empty') !== (run.lantern.phase === 'open') || has(run, 'released') && run.lantern.occupant === 'whisper') return;
  if (['lens', 'lantern', 'bellows', 'fork', 'chalk'].some(id => run.inventory[id as keyof Run['inventory']] !== 'inventory')) return;
  const combined = run.inventory.longBrush === 'inventory';
  if (run.inventory.longBrush === 'consumed' || (run.inventory.brush === 'consumed') !== combined || (run.inventory.poker === 'consumed') !== combined) return;
  if (run.inventory.cabinetKey === 'consumed' || run.inventory.windingKey === 'consumed') return;
  if (has(run, 'cabinetOpen') !== (run.inventory.windingKey === 'inventory') || has(run, 'cabinetOpen') && run.inventory.cabinetKey !== 'inventory') return;
  if (has(run, 'music') && !has(run, 'cabinetOpen') || has(run, 'testimony') && (!has(run, 'music') || !has(run, 'photoLit')) || has(run, 'mechanism') && !has(run, 'tubeOpen') || has(run, 'tubeOpen') && !combined) return;
  for (const id of ['fraud', 'guardians'] as const) if (has(run, id) && !deductions[id].requires.every(f => has(run, f))) return;
  if (has(run, 'confronted') && (!has(run, 'fraud') || !has(run, 'guardians')) || run.room === 'bell' && !has(run, 'confronted')) return;
  if (['chain', 'ward', 'mirror'].some(f => has(run, f as Fact)) && !has(run, 'confronted')) return;
  if (run.lantern.occupant === 'guest' && !wardReady(run) || (run.status === 'complete') !== has(run, 'finished')) return;
  if (has(run, 'finished') && (run.lantern.occupant !== 'guest' || run.lantern.phase !== 'sealed')) return;
  run.message = 'Adventure restored. Your casebook remembers the evidence.'; return run;
}
export const SAVE_KEY = 'arcade-lab:thirteenth-guest:v1';
interface Envelope { schema: 1; story: 'thirteenth-guest'; content: 1; current: Snapshot; previous: Snapshot | null }
export function readEnvelope(raw: string | null): { current: Run | undefined; previous: Run | undefined } | undefined {
  if (!raw || raw.length > 250000) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.schema !== 1 || value.story !== 'thirteenth-guest' || value.content !== 1) return;
    return { current: restore(value.current), previous: restore(value.previous) };
  } catch { return; }
}
export function encode(current: Snapshot, previous: Snapshot | null) {
  const value: Envelope = { schema: 1, story: 'thirteenth-guest', content: 1, current, previous }; return JSON.stringify(value);
}
