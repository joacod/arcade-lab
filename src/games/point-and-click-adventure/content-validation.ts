import { rooms, targets, type RoomDefinition, type TargetDefinition } from './content.ts';
import { inside, route } from './navigation.ts';
/** Authoring errors name the room/target before an invalid case can begin. */
export function contentErrors(roomDefinitions: Record<string, RoomDefinition> = rooms, targetDefinitions: Record<string, TargetDefinition> = targets): string[] {
  const errors: string[] = [];
  for (const [id, room] of Object.entries(roomDefinitions)) {
    if (!room.floor.length || room.floor.some(f => ![f.x, f.y, f.w, f.h].every(Number.isFinite) || f.w <= 0 || f.h <= 0)) errors.push(`${id}: floor cells need finite positions and positive dimensions`);
    if (![room.entry.x, room.entry.y].every(Number.isFinite) || !room.floor.some(f => inside(room.entry, f))) errors.push(`${id}: entry must lie on a walkable floor`);
  }
  for (const [id, target] of Object.entries(targetDefinitions)) {
    const room = roomDefinitions[target.room];
    if (!room) { errors.push(`${id}: unknown room ${target.room}`); continue; }
    if (![target.x, target.y, target.w, target.h, target.at.x, target.at.y].every(Number.isFinite) || target.w <= 0 || target.h <= 0) errors.push(`${id}: target and approach geometry must be finite and positive`);
    if (!route(room.entry, target.at, room.floor)) errors.push(`${id}: approach is unreachable from the room entry`);
    if (target.destination && !roomDefinitions[target.destination]) errors.push(`${id}: unknown destination ${target.destination}`);
  }
  return errors;
}
