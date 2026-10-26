import { clearing, enemies, evolution, upgrades, weapons } from './content.ts';

export const content = { clearing, enemies, evolution, upgrades, weapons };
/** Small checks for this game's authored data; diagnostics name the field to repair. */
export function validateContent(data = content): string[] {
  const errors: string[] = [];
  const positive = (value: number, path: string, integer = false) => {
    if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isSafeInteger(value))) errors.push(`${path}: expected a positive ${integer ? 'integer' : 'finite number'}`);
  };
  const nonnegative = (value: number, path: string) => {
    if (!Number.isFinite(value) || value < 0) errors.push(`${path}: expected a nonnegative finite number`);
  };
  const { clearing: rules } = data;
  for (const [key, value] of Object.entries(rules.arena)) positive(value, `arena.${key}`);
  for (const [key, value] of Object.entries(rules.keeper)) positive(value, `keeper.${key}`, key === 'maxHealth');
  for (const [key, value] of Object.entries(rules.progression)) positive(value, `progression.${key}`, ['firstCost', 'increment', 'choiceCount'].includes(key));
  if (rules.progression.choiceCount !== 3) errors.push('progression.choiceCount: this game requires three choices');
  for (const [key, value] of Object.entries(rules.round)) if (typeof value === 'number') positive(value, `round.${key}`, ['ordinaryCap', 'edgeDivisions'].includes(key));
  if (rules.round.edgeDivisions < 2) errors.push('round.edgeDivisions: must provide edge candidates');
  if (rules.round.eliteAt >= rules.round.duration) errors.push('round.eliteAt: must be before duration');
  if (rules.round.entryInset * 2 >= Math.min(rules.arena.width, rules.arena.height)) errors.push('round.entryInset: must fit inside arena');
  // Every Keeper location must have a safe far edge, even with the full-arena view.
  const halfWidth = rules.arena.width / 2 - rules.round.entryInset;
  const halfHeight = rules.arena.height / 2 - rules.round.entryInset;
  const edgeFraction = 1 - 2 / rules.round.edgeDivisions;
  const farEdge = Math.max(Math.hypot(halfWidth, halfHeight * edgeFraction), Math.hypot(halfWidth * edgeFraction, halfHeight));
  if (rules.round.entryMinDistance > farEdge) errors.push('round.entryMinDistance: exceeds guaranteed far-edge separation');
  if (rules.keeper.radius * 2 >= Math.min(rules.arena.width, rules.arena.height)) errors.push('keeper.radius: must fit arena');
  if (!Number.isFinite(rules.initialEnemy.x) || !Number.isFinite(rules.initialEnemy.y)
    || rules.initialEnemy.x < 0 || rules.initialEnemy.x > rules.arena.width || rules.initialEnemy.y < 0 || rules.initialEnemy.y > rules.arena.height) errors.push('initialEnemy: must be inside arena');
  let previous = -1;
  if (!rules.round.phases.length) errors.push('round.phases: at least one phase is required');
  rules.round.phases.forEach((phase, index) => {
    if (!Number.isFinite(phase.start) || phase.start <= previous || phase.start >= rules.round.duration || (index === 0 && phase.start !== 0)) errors.push(`round.phases[${index}].start: must start at zero and increase below duration`);
    previous = phase.start;
    positive(phase.interval, `round.phases[${index}].interval`);
  });
  const behaviors = ['nearest-shot', 'orbit', 'pulse', 'cardinal-burst'];
  const seen = new Set<string>();
  for (const [id, weapon] of Object.entries(data.weapons)) {
    if (!weapon.name.trim()) errors.push(`weapons.${id}.name: required`);
    if (!behaviors.includes(weapon.behavior) || seen.has(weapon.behavior)) errors.push(`weapons.${id}.behavior: require one of each supported behavior`);
    seen.add(weapon.behavior);
    if (weapon.damage.length !== 3) errors.push(`weapons.${id}.damage: require three ranks`);
    weapon.damage.forEach((damage, rank) => positive(damage, `weapons.${id}.damage[${rank}]`));
    for (const key of ['cadence', 'lifetime', 'hitRadius'] as const) positive(weapon[key], `weapons.${id}.${key}`);
    for (const key of ['speed', 'radius'] as const) nonnegative(weapon[key], `weapons.${id}.${key}`);
    if (['nearest-shot', 'cardinal-burst'].includes(weapon.behavior)) positive(weapon.speed, `weapons.${id}.speed`);
    else positive(weapon.radius, `weapons.${id}.radius`);
  }
  if (seen.size !== behaviors.length) errors.push('weapons: require four behavior definitions');
  if (!data.weapons[rules.startingWeapon]) errors.push('startingWeapon: must reference a base weapon');
  for (const [id, enemy] of Object.entries(data.enemies)) {
    if (!enemy.name.trim()) errors.push(`enemies.${id}.name: required`);
    for (const key of ['maxHealth', 'contactDamage', 'xp', 'speed', 'radius'] as const) positive(enemy[key], `enemies.${id}.${key}`, ['maxHealth', 'contactDamage', 'xp'].includes(key));
    if (enemy.radius > rules.round.entryInset) errors.push(`enemies.${id}.radius: must fit entry inset`);
  }
  if (data.enemies.crawler.elite || !data.enemies.elite_crawler.elite) errors.push('enemies: require ordinary crawler and elite variant');
  const ids = new Set<string>(), targets = new Set<string>(), kinds = new Set<string>();
  for (const upgrade of data.upgrades) {
    const path = `upgrades.${upgrade.id}`;
    if (!upgrade.id.trim() || ids.has(upgrade.id)) errors.push(`${path}.id: must be unique and nonempty`);
    ids.add(upgrade.id); kinds.add(upgrade.kind);
    if (!upgrade.name.trim() || !upgrade.description.trim()) errors.push(`${path}: name and description are required`);
    if (upgrade.kind === 'weapon') {
      const weapon = data.weapons[upgrade.weapon];
      if (!weapon || targets.has(upgrade.weapon) || upgrade.maxRank !== weapon.damage.length) errors.push(`${path}.weapon: require a distinct base weapon and matching rank count`);
      targets.add(upgrade.weapon);
    } else positive(upgrade.amount, `${path}.amount`, upgrade.kind === 'recovery');
  }
  if (targets.size !== Object.keys(data.weapons).length) errors.push('upgrades: every weapon needs a rank choice');
  for (const kind of ['lens', 'recovery', 'power', 'reach']) {
    if (!kinds.has(kind) || data.upgrades.filter(upgrade => upgrade.kind === kind).length !== 1) errors.push(`upgrades: require one ${kind} choice`);
  }
  const recipe = data.evolution, weapon = data.weapons[recipe.weapon];
  if (!weapon || !Number.isInteger(recipe.rank) || recipe.rank < 1 || recipe.rank > weapon.damage.length) errors.push('evolution.rank: must reference an existing weapon rank');
  if (!data.upgrades.some(upgrade => upgrade.id === recipe.passive && upgrade.kind === 'lens')) errors.push('evolution.passive: must reference Lens');
  if (!recipe.replacement.trim() || recipe.replacement in data.weapons) errors.push('evolution.replacement: must be a distinct semantic ID');
  positive(recipe.chainLimit, 'evolution.chainLimit', true);
  return errors;
}
