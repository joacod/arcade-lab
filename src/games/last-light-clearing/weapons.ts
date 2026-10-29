import { weapons } from './content.ts';
import type { RunState } from './game-state.ts';
import { fireSpark } from './weapons/spark.ts';
import { advanceHalo } from './weapons/halo.ts';
import { firePulse } from './weapons/pulse.ts';
import { fireShard } from './weapons/shard.ts';
import { cadence } from './weapon-stats.ts';

export function advanceWeapons(run: RunState, dt: number): void {
  for (const slot of run.loadout) {
    const data = weapons[slot.base];
    if (data.behavior === 'orbit') { advanceHalo(run, slot, dt); continue; }
    slot.cooldown -= dt;
    if (slot.cooldown > 1e-9) continue;
    slot.cooldown += cadence(slot.base, slot.rank);
    switch (data.behavior) {
      case 'nearest-shot': fireSpark(run, slot); break;
      case 'pulse': firePulse(run, slot); break;
      case 'cardinal-burst': fireShard(run, slot); break;
    }
  }
}
