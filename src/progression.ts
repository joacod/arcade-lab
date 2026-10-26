import { clearing, evolution, upgrades, weapons, type UpgradeDefinition, type WeaponId } from './content.ts';
import type { RunState, WeaponInstance } from './game-state.ts';

export function equip(base: WeaponId): WeaponInstance {
  return { base, id: base, rank: 1, cooldown: weapons[base].cadence, orbitAngle: 0, nextHit: new Map() };
}
export function xpThreshold(run: RunState): number {
  return clearing.progression.firstCost + (run.progression.level - 1) * clearing.progression.increment;
}
export function pickupRadius(run: RunState): number {
  const lens = upgrades.find(upgrade => upgrade.kind === 'lens');
  return (run.modifiers.lens && lens?.kind === 'lens' ? Math.max(clearing.progression.pickupRadius, lens.amount)
    : clearing.progression.pickupRadius) + run.modifiers.reach;
}
export function choiceLevel(run: RunState): number { return run.progression.level - run.progression.pending + 1; }
export function eligible(run: RunState, upgrade: UpgradeDefinition): boolean {
  if (upgrade.kind === 'weapon') {
    const slot = run.loadout.find(slot => slot.base === upgrade.weapon);
    return (!slot || slot.id === slot.base) && (slot?.rank ?? 0) < upgrade.maxRank;
  }
  return upgrade.kind !== 'lens' || !run.modifiers.lens;
}
function presentChoices(run: RunState): void {
  const offered: UpgradeDefinition[] = [];
  const add = (upgrade: UpgradeDefinition | undefined) => {
    if (upgrade && eligible(run, upgrade) && !offered.includes(upgrade)
      && offered.length < clearing.progression.choiceCount) offered.push(upgrade);
  };
  add(upgrades.find(upgrade => upgrade.kind === 'weapon' && !run.loadout.some(slot => slot.base === upgrade.weapon)));
  if (choiceLevel(run) >= clearing.progression.lensPriorityLevel) add(upgrades.find(upgrade => upgrade.kind === 'lens'));
  add(upgrades.find(upgrade => upgrade.kind === 'weapon' && upgrade.weapon === evolution.weapon));
  for (const upgrade of upgrades) add(upgrade);
  run.progression.choices = offered.map(({ id, name, description, ...definition }) => {
    const rank = definition.kind === 'weapon' ? (run.loadout.find(slot => slot.base === definition.weapon)?.rank ?? 0) + 1 : 0;
    return { id, name: rank ? `${name} · Rank ${rank}` : name, description };
  });
  run.status = 'choosing';
}
export function grantXP(run: RunState, amount: number): void {
  if (run.status !== 'active' || !Number.isSafeInteger(amount) || amount <= 0) return;
  run.stats.xpCollected += amount;
  run.progression.xp += amount;
  while (run.progression.xp >= xpThreshold(run)) {
    run.progression.xp -= xpThreshold(run);
    run.progression.level++;
    run.progression.pending++;
  }
  if (run.progression.pending) presentChoices(run);
}
/** Only an offered semantic ID can be applied. Confirmation release is a separate action. */
export function selectUpgrade(run: RunState, id: string): boolean {
  if (run.status !== 'choosing' || run.progression.confirming || !run.progression.choices.some(choice => choice.id === id)) return false;
  const upgrade = upgrades.find(upgrade => upgrade.id === id);
  if (!upgrade || !eligible(run, upgrade)) return false;
  switch (upgrade.kind) {
    case 'weapon': {
      const slot = run.loadout.find(slot => slot.base === upgrade.weapon);
      if (slot) slot.rank++;
      else run.loadout.push(equip(upgrade.weapon));
      break;
    }
    case 'lens': run.modifiers.lens = true; break;
    case 'power': run.modifiers.power += upgrade.amount; break;
    case 'reach': run.modifiers.reach += upgrade.amount; break;
    case 'recovery': {
      const healed = Math.min(upgrade.amount, clearing.keeper.maxHealth - run.player.health);
      run.player.health += healed;
      run.player.shield += upgrade.amount - healed;
      break;
    }
  }
  const spark = run.loadout.find(slot => slot.base === evolution.weapon);
  if (spark && spark.id !== evolution.replacement && spark.rank >= evolution.rank && run.modifiers.lens) {
    spark.id = evolution.replacement;
    run.projectiles = run.projectiles.filter(projectile => projectile.weapon !== evolution.weapon);
    run.events.push({ type: 'evolution', at: run.elapsed });
  }
  run.stats.upgrades++;
  run.events.push({ type: 'upgrade', at: run.elapsed });
  run.progression.pending--;
  run.progression.choices = [];
  run.progression.confirming = true;
  return true;
}
/** Called by composition after the physical confirmation has fully ended. */
export function releaseChoice(run: RunState): void {
  if (run.status !== 'choosing' || !run.progression.confirming) return;
  run.progression.confirming = false;
  if (run.progression.pending) presentChoices(run);
  else run.status = 'active';
}

export function advanceGems(run: RunState, dt: number): void {
  let collected = 0;
  const radius = pickupRadius(run);
  run.gems = run.gems.filter(gem => {
    const dx = run.player.x - gem.x, dy = run.player.y - gem.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= radius) gem.attracted = true;
    if (!gem.attracted) return true;
    const travel = Math.min(distance, clearing.progression.gemSpeed * dt);
    if (distance > 0) { gem.x += dx / distance * travel; gem.y += dy / distance * travel; }
    if (distance - travel <= clearing.progression.collectRadius) { collected += gem.amount; return false; }
    return true;
  });
  // Batch this tick's collections so entering a choice never loses sibling gems or XP.
  if (collected) run.events.push({ type: 'pickup', x: run.player.x, y: run.player.y, at: run.elapsed });
  grantXP(run, collected);
}
