import { getTarget, items, type ItemId, type TargetId } from './content.ts';
import { has, type Run, type TargetCommand } from './game.ts';

/** One description drives scene buttons, pointer feedback and command dispatch. */
export function interaction(run: Run, target: TargetId, item?: ItemId): { label: string; command: TargetCommand } {
  const definition = getTarget(target);
  if (item) return { label: `Use ${items[item].name} on ${definition.name}`, command: { kind: 'target', target, verb: 'use', item } };
  let action = definition.action;
  if (target === 'tube' && has(run, 'tubeOpen')) action = has(run, 'mechanism') ? 'Disconnect clock' : 'Test mechanism';
  const label = definition.destination ? `Go to ${definition.name}` : action === 'Talk' ? `Talk to ${definition.name}` : `${action}: ${definition.name}`;
  return { label, command: { kind: 'target', target, verb: definition.verb } };
}
