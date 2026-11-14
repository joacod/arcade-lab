import { rooms, targetIds, getTarget, items, itemIds, deductions, evidence, scenes, type RoomId, type TargetId, type ItemId, type Fact, type Point, type Line, type SceneId, type DeductionId, type EvidenceId } from './content.ts';
import { project, route } from './navigation.ts';
export type Cue = 'discovery' | 'ghost' | 'mechanism' | 'seal' | 'music' | 'bell';
export type TargetCommand = { kind: 'target'; target: TargetId; verb: 'inspect' | 'interact' }
  | { kind: 'target'; target: TargetId; verb: 'use'; item: ItemId };
export type Command = TargetCommand | { kind: 'walk'; point: Point } | { kind: 'combine'; first: ItemId; second: ItemId }
  | { kind: 'tool'; item: ItemId } | { kind: 'deduce'; conclusion: DeductionId; evidence: EvidenceId[] }
  | { kind: 'topic'; id: string } | { kind: 'next' | 'skip' | 'cancel' | 'leave' | 'hint' };
export interface Dialogue { lines: Line[]; index: number; scene: SceneId | undefined }
export interface Run {
  room: RoomId; actor: Point; facing: number; status: 'active' | 'complete';
  facts: Fact[]; inventory: Record<ItemId, 'inventory' | 'world' | 'consumed'>;
  lantern: { occupant: 'empty' | 'whisper' | 'guest'; phase: 'open' | 'drawn' | 'closed' | 'sealed' };
  pending: { path: Point[]; command: TargetCommand | undefined } | undefined;
  dialogue: Dialogue | undefined; conversation: TargetId | undefined;
  message: string; transcript: Line[]; hintLevels: Record<string, number>; revision: number; saveRevision: number; events: Cue[];
}
export const has = (run: Run, fact: Fact) => run.facts.includes(fact);
export const owns = (run: Run, item: ItemId) => run.inventory[item] === 'inventory';
export function createRun(): Run {
  return { room: 'hall', actor: { ...rooms.hall.entry }, facing: 1, status: 'active', facts: [],
    inventory: Object.fromEntries(itemIds.map(id => [id, ['lens', 'lantern', 'bellows', 'fork', 'chalk'].includes(id) ? 'inventory' : 'world'])) as Run['inventory'],
    lantern: { occupant: 'empty', phase: 'open' }, pending: undefined, dialogue: undefined, conversation: undefined,
    message: 'Welcome to Blackthorn Castle. Click a person to talk or an object to investigate.', transcript: [], hintLevels: {}, revision: 0, saveRevision: 0, events: [] };
}
function changed(run: Run) { run.saveRevision++; }
function flag(run: Run, fact: Fact) { if (!has(run, fact)) { run.facts.push(fact); changed(run); if (fact in evidence) run.events.push('discovery'); } }
function take(run: Run, item: ItemId) { if (!owns(run, item)) { run.inventory[item] = 'inventory'; changed(run); run.events.push('mechanism'); } }
function message(run: Run, text: string) { run.message = text; }
function remember(run: Run, line: Line) { run.transcript.push({ ...line }); if (run.transcript.length > 80) run.transcript.shift(); }
function speak(run: Run, speaker: string, text: string) {
  run.message = ''; run.pending = undefined; run.dialogue = { lines: [{ speaker, text }], index: 0, scene: undefined }; remember(run, { speaker, text });
}
export function startScene(run: Run, id: SceneId) {
  run.pending = undefined; run.conversation = undefined;
  const lines: Line[] = scenes[id].filter((_, i) => id !== 'ending' || i !== 4 || has(run, 'released')).map(l => ({ ...l }));
  run.dialogue = { lines, index: 0, scene: id }; remember(run, lines[0]!); run.revision++;
}
function finishScene(run: Run, id: SceneId | undefined) {
  if (id === 'intro') { flag(run, 'introduced'); message(run, 'Try your equipment: open Inventory, choose Spirit lantern, then click the loose whisper.'); }
  if (id === 'testimony') { flag(run, 'testimony'); message(run, 'Testimony recorded. Compare it with the keeper’s account in your casebook.'); }
  if (id === 'confrontation') { flag(run, 'confronted'); flag(run, 'voice'); run.events.push('bell'); message(run, 'The guards are your allies. Enter the bell chamber and restore the ward.'); }
  if (id === 'ending') { flag(run, 'finished'); run.status = 'complete'; run.events.push('bell'); }
}
function advance(run: Run, skip = false) {
  const dialog = run.dialogue;
  if (!dialog) return;
  if (!skip && dialog.index + 1 < dialog.lines.length) { dialog.index++; remember(run, dialog.lines[dialog.index]!); }
  else { run.dialogue = undefined; finishScene(run, dialog.scene); changed(run); }
}
export function visible(run: Run, id: TargetId) {
  if (getTarget(id).room !== run.room) return false;
  if (id === 'brush' || id === 'poker') return run.inventory[id] === 'world';
  if (id === 'whisper') return !has(run, 'released') && run.lantern.occupant !== 'whisper';
  if (id === 'guest') return run.lantern.occupant !== 'guest';
  return true;
}
export const roomTargets = (run: Run) => targetIds.filter(id => visible(run, id));
export const wardReady = (run: Run) => has(run, 'chain') && has(run, 'ward') && has(run, 'mirror');
export function objective(run: Run) {
  if (run.status === 'complete') return 'Case closed · one haunting preserved';
  if (run.lantern.occupant === 'guest' && run.lantern.phase === 'sealed') return 'Secure the captured Guest inside the bell housing';
  if (has(run, 'confronted')) return wardReady(run) ? 'Contain the weakened Guest · bellows, shutter, fork' : 'Restore the chain, chalk boundary and inward mirror';
  if (has(run, 'fraud') && has(run, 'guardians')) return 'Confront Professor Vale with your conclusions';
  if (!has(run, 'tutorial') && !has(run, 'vent') && !has(run, 'record') && !has(run, 'mechanism') && !has(run, 'testimony')) {
    if (run.lantern.phase === 'drawn') return 'Close the lantern shutter to keep the whisper inside';
    if (run.lantern.phase === 'closed') return 'Sound the tuning fork to seal the whisper';
    return has(run, 'whisperLit') ? 'Use the hand bellows on the loose whisper' : 'Try your spirit lantern on the loose whisper';
  }
  return 'Investigate the screams and learn what the household is guarding';
}
export interface Topic { id: string; label: string }
export function topics(run: Run, id: TargetId): Topic[] {
  if (id === 'evelyn') return [{ id: 'evelyn-case', label: 'What changed when the restoration began?' }, { id: 'evelyn-key', label: 'May I borrow the household cabinet key?' }, { id: 'evelyn-family', label: 'Tell me about the housekeeper and her music box.' }];
  if (id === 'vale') return [{ id: 'vale-case', label: 'What exactly did you hire me to remove?' }, { id: 'vale-voice', label: 'Was that your voice upstairs?' }, ...(has(run, 'mark') ? [{ id: 'vale-mark', label: 'Your mark is on these new fittings.' }] : []), ...(has(run, 'fraud') && has(run, 'guardians') && !has(run, 'confronted') ? [{ id: 'confront', label: 'The screams are staged. The ghosts are guards.' }] : [])];
  if (id === 'oswald') return [{ id: 'oswald-chain', label: 'Why are you dragging that chain?' }, { id: 'oswald-portrait', label: 'Can this portrait house a loose spirit?' }, { id: 'oswald-ward', label: 'What is behind the bell door?' }];
  if (id === 'brindle') return [{ id: 'brindle-memory', label: 'What happened at the bell?' }, { id: 'brindle-family', label: 'How long have you cared for the family?' }];
  return [];
}
function topic(run: Run, id: string) {
  if (!run.conversation || !topics(run, run.conversation).some(t => t.id === id)) return;
  switch (id) {
    case 'evelyn-case': speak(run, 'Evelyn', 'The portraits only began screaming after Vale repaired the service tubes. Oswald has been restless ever since. I should have listened to him.'); break;
    case 'evelyn-key': take(run, 'cabinetKey'); speak(run, 'Evelyn', 'Of course. The winding key is in the kitchen cabinet. If that old music box comforts Mrs. Brindle, please wind it.'); break;
    case 'evelyn-family': speak(run, 'Evelyn', 'Brindle raised my grandmother. Death has done very little to diminish her standards. The photograph beside her music box is her favorite.'); break;
    case 'vale-case': speak(run, 'Vale', has(run, 'confronted') ? 'I thought I would command it. Please, Wren. Stop it before it learns to be me.' : 'Clear out the violent spirits. Particularly the knight. That chain is plainly part of some sinister ceremony.'); break;
    case 'vale-voice': flag(run, 'voice'); speak(run, 'Vale', 'I assure you, there is a perfectly rational explanation. [The same words drift from upstairs. Vale has stopped speaking.]'); break;
    case 'vale-mark': speak(run, 'Vale', 'My restoration mark. Naturally. There are miles of service tubes here. Nothing supernatural about plumbing, Mr. Wren.'); break;
    case 'confront': startScene(run, 'confrontation'); break;
    case 'oswald-chain': speak(run, 'Oswald', 'A protector should not have to explain his chain to a man paid to remove him. Find out what your employer has been doing below stairs.'); break;
    case 'oswald-portrait': speak(run, 'Oswald', 'Silver-lined portraits house little household echoes. Use your occupied lantern on the empty frame. No need to keep an innocent whisper in a bottle.'); break;
    case 'oswald-ward': speak(run, 'Oswald', has(run, 'confronted') ? 'The Guest is too strong for your lantern until the chain, chalk boundary and mirror are restored. Then draw it in, close the shutter and seal it with the fork. Secure the vessel in the bell housing.' : 'I guard that door. Ask the housekeeper what we were protecting, then read the keeper’s account. I will not let Vale’s hired exorcist pass.'); break;
    case 'brindle-memory':
      if (has(run, 'music') && has(run, 'photoLit')) {
        if (has(run, 'testimony')) speak(run, 'Brindle', 'We kept the Guest inside. Vale damaged the ward. The keeper’s journal explains how to put it right.');
        else startScene(run, 'testimony');
      } else speak(run, 'Brindle', 'The music… and that photograph… I cannot quite hold myself together. A little light, Mr. Wren. A familiar tune.');
      break;
    case 'brindle-family': speak(run, 'Brindle', 'I have been dead for sixty-three years, Mr. Wren. The dust is considerably older.'); break;
  }
}
function inspect(run: Run, id: TargetId) {
  if (id === 'portrait') { flag(run, 'vent'); message(run, 'The scream bends the candle flame away from the grille and shifts soot. A physical draft. Evidence recorded.'); }
  else if (id === 'crate') { flag(run, 'mark'); message(run, 'Vale’s V-in-a-diamond mark is stamped on the new fittings. Evidence recorded.'); }
  else if (id === 'journal') { flag(run, 'record'); message(run, evidence.record.text + ' Evidence recorded.'); }
  else if (id === 'tube' && has(run, 'tubeOpen')) message(run, 'New bellows and a shaped reed, driven by the service clock. The test lever connects to the portrait. Vale’s mark is on the fittings.');
  else if (id === 'musicBox' && has(run, 'music')) message(run, 'The melody now plays steadily. Brindle seems clearer. Lantern light on the family photograph may help her remember.');
  else if (id === 'guest' && wardReady(run)) message(run, 'Its borrowed face is coming apart. The ward has weakened it enough for the lantern.');
  else message(run, getTarget(id).description);
}
function interact(run: Run, id: TargetId) {
  const target = getTarget(id);
  if (target.destination) {
    if (target.destination === 'bell' && !has(run, 'confronted')) { message(run, 'Oswald bars the door. Establish what the household protects, and confront Vale with both conclusions.'); return; }
    run.room = target.destination; run.actor = { ...rooms[run.room].entry }; run.conversation = undefined; changed(run);
    message(run, rooms[run.room].subtitle); run.events.push('mechanism'); return;
  }
  if (['evelyn', 'vale', 'oswald', 'brindle'].includes(id)) {
    run.conversation = id;
    speak(run, target.name, id === 'oswald' ? 'You stand before Sir Oswald Blackthorn. Kindly face the head, not the collar.' : id === 'brindle' ? 'Do mind the carpet. Floating is no excuse for bad manners.' : id === 'evelyn' ? 'Please save my home, Mr. Wren. And try to save a little of its dignity.' : has(run, 'confronted') ? 'Please, Wren. Do not let it leave wearing my face.' : 'The knight, Wren. Deal with the knight.'); return;
  }
  switch (id) {
    case 'brush': case 'poker': take(run, id); message(run, `${items[id].name} added to your case.`); break;
    case 'cabinet':
      if (has(run, 'cabinetOpen')) { take(run, 'windingKey'); message(run, 'The music-box winding key is safely in your case.'); }
      else message(run, 'Locked. Evelyn has the household key; she may be willing to lend it.');
      break;
    case 'tube':
      if (!has(run, 'tubeOpen')) message(run, 'The service tube is blocked with soot, beyond the short brush’s reach.');
      else if (!has(run, 'mechanism')) { flag(run, 'mechanism'); run.events.push('mechanism'); message(run, 'You pull the test lever. The portrait screams upstairs. Its draft is explained: bellows, reed, service tube. Evidence recorded.'); }
      else { flag(run, 'disabled'); message(run, 'You disconnect the clock linkage. The false screaming stops. The mechanism remains available as evidence.'); }
      break;
    case 'chain': flag(run, 'chain'); run.events.push('mechanism'); message(run, 'The chain is secured to the marked anchor. A restraint, never a weapon.'); break;
    case 'mirror': flag(run, 'mirror'); run.events.push('ghost'); message(run, 'The mirror faces inward. The Guest suddenly looks less like a man and more like an excuse.'); break;
    case 'housing': secure(run); break;
    case 'whisper': message(run, '“A perfectly rational explanation!” it squeaks. Reveal it with lantern light, then use the bellows.'); break;
    case 'guest': message(run, '“I assure you… I assure you…” It cannot answer a fresh question. Repair the ward before trying to draw it in.'); break;
    default: inspect(run, id);
  }
}
function secure(run: Run) {
  if (run.lantern.occupant === 'guest' && run.lantern.phase === 'sealed' && wardReady(run)) startScene(run, 'ending');
  else message(run, 'This housing will secure the Guest’s vessel once it is captured and sealed.');
}
function drawSpirit(run: Run, occupant: 'whisper' | 'guest') {
  if (run.lantern.occupant !== 'empty') { message(run, 'The lantern already holds a presence. A sealed whisper can be released into the gallery’s empty portrait.'); return; }
  if (occupant === 'whisper' && !has(run, 'whisperLit')) { message(run, 'First use lantern light to locate the whisper’s outline.'); return; }
  if (occupant === 'guest' && !wardReady(run)) { message(run, 'A gust knocks the bellows back. Too strongly anchored. Restore the chain, chalk boundary and inward mirror.'); run.events.push('ghost'); return; }
  run.lantern = { occupant, phase: 'drawn' }; changed(run); run.events.push('ghost');
  message(run, 'The presence swirls inside the lantern. Close the lantern shutter, then sound the tuning fork.');
}
function use(run: Run, id: TargetId, item: ItemId) {
  if (!owns(run, item)) return;
  if (item === 'lens') { inspect(run, id); return; }
  if (item === 'lantern') {
    if (id === 'whisper') { flag(run, 'whisperLit'); message(run, 'Raking light outlines a tiny, loose spirit. Use the hand bellows on it.'); run.events.push('ghost'); return; }
    if (id === 'photo') { flag(run, 'photoLit'); message(run, 'Warm impressions gather around the photograph. With her music playing, Brindle can hold a conversation.'); return; }
    if (id === 'emptyFrame' && run.lantern.occupant === 'whisper' && run.lantern.phase === 'sealed') {
      run.lantern = { occupant: 'empty', phase: 'open' }; flag(run, 'released'); changed(run); run.events.push('seal'); message(run, '“Finally, somewhere with a view.” The whisper settles into its portrait. Your lantern is empty.'); return;
    }
    if (id === 'housing') { secure(run); return; }
    message(run, id === 'portrait' ? 'No spectral outline in this painting. The scream may have a more ordinary explanation.' : 'The lantern reveals no new impression here. Try observation, conversation or another tool.'); return;
  }
  if (item === 'bellows') {
    if (id === 'whisper' || id === 'guest') drawSpirit(run, id);
    else message(run, id === 'oswald' ? '“I am a knight, sir. Not a draft.” Anchored spirits cannot simply be drawn in.' : 'Ordinary air. The bellows are useful for a loose or weakened spirit.');
    return;
  }
  if (item === 'longBrush' && id === 'tube') { flag(run, 'tubeOpen'); message(run, 'You sweep the blocked access clear and open its cover. A new bellows mechanism is inside. Test it.'); return; }
  if ((item === 'brush' || item === 'poker') && id === 'tube') { message(run, item === 'brush' ? 'Too short to reach. Its threaded head could fit something longer.' : 'Long enough, but no brush to clear the soot. Its threaded end might help.'); return; }
  if (item === 'cabinetKey' && id === 'cabinet') { flag(run, 'cabinetOpen'); take(run, 'windingKey'); message(run, 'The cabinet opens. You take the music-box winding key.'); return; }
  if (item === 'windingKey' && id === 'musicBox') { flag(run, 'music'); run.events.push('music'); message(run, 'The familiar tune plays. Brindle steadies. Illuminate the family photograph, then ask about the bell.'); return; }
  if (item === 'chalk' && id === 'ward') { flag(run, 'ward'); message(run, 'You complete the chalk boundary. The circle holds.'); run.events.push('seal'); return; }
  if (item === 'fork') { tool(run, item); return; }
  message(run, `${items[item].name} does not help with ${getTarget(id).name.toLowerCase()}. Nothing is consumed.`);
}
function tool(run: Run, item: ItemId) {
  if (!owns(run, item)) return;
  if (item === 'lantern') {
    if (run.lantern.phase === 'drawn') { run.lantern.phase = 'closed'; changed(run); message(run, 'Shutter closed. Sound the tuning fork to seal the presence.'); }
    else message(run, run.lantern.phase === 'closed' ? 'The shutter is closed. Sound the fork.' : run.lantern.phase === 'sealed' ? 'Already sealed. Release a whisper into the empty portrait, or secure the Guest in the bell housing.' : 'The lantern is empty. Reveal and draw in a spirit first.');
  } else if (item === 'fork') {
    if (run.lantern.phase === 'closed') { run.lantern.phase = 'sealed'; changed(run); if (run.lantern.occupant === 'whisper') flag(run, 'tutorial'); run.events.push('seal'); message(run, run.lantern.occupant === 'guest' ? 'The Guest is sealed. Secure the lantern inside the bell housing.' : 'The whisper is sealed. The empty portrait in the gallery could give it a better home.'); }
    else if (run.lantern.phase === 'drawn') { run.lantern = { occupant: 'empty', phase: 'open' }; changed(run); message(run, 'The presence escapes through the open shutter. It remains nearby. Draw it in again, close the shutter, THEN sound the fork.'); }
    else message(run, 'A clear note. There is no unsealed presence behind a closed shutter.');
  } else message(run, items[item].description);
}
const hintTracks = {
  whisper: ['A loose whisper is a chance to practice your equipment.', 'Lantern light reveals its shape. The bellows draw it in.', 'After drawing it in, close the lantern shutter and sound the tuning fork.'],
  fraud: ['The portrait’s scream disturbs things that are not ghosts.', 'Inspect its vent. The kitchen service tube connects to it.', 'Combine the kitchen brush and poker, use the extended brush on the tube, then test the mechanism.', 'In the casebook, select the draft and manufactured-scream evidence and propose the manufactured-scare conclusion.'],
  guardians: ['Brindle remembers the castle before the restoration.', 'Her familiar music and the photograph help her hold herself together.', 'Ask Evelyn for the household key. Open the kitchen cabinet, use the winding key on the music box, and lantern light on the photograph.', 'Ask Brindle what happened, read the keeper’s journal, then support the guardians conclusion with both pieces of evidence.'],
  confront: ['You have two supported conclusions. It is time to question your client.', 'Talk to Vale in the Great Hall and choose the accusation about staged screams and ghost guards.'],
  ward: ['The keeper used three restraints.', 'In the bell chamber attach the chain, use chalk on the broken line and turn the mirror inward.'],
  release: ['Your lantern needs room for the Guest.', 'Use the sealed whisper’s lantern on the empty portrait in the gallery. If it is not sealed yet, close the shutter and sound the fork first.'],
  capture: ['The repaired ward has made the Guest vulnerable.', 'Use bellows on the Guest. Close the lantern shutter, sound the fork, then use the sealed lantern on the bell housing.'],
};
export function requestHint(run: Run) {
  const key = !has(run, 'tutorial') && !has(run, 'confronted') && !['vent', 'record', 'mechanism', 'testimony'].some(f => has(run, f as Fact)) ? 'whisper' : !has(run, 'fraud') ? 'fraud' : !has(run, 'guardians') ? 'guardians' : !has(run, 'confronted') ? 'confront' : !wardReady(run) ? 'ward' : run.lantern.occupant === 'whisper' ? 'release' : 'capture';
  const track = hintTracks[key], level = Math.min(run.hintLevels[key] ?? 0, track.length - 1);
  run.hintLevels[key] = Math.min(level + 1, track.length - 1); changed(run);
  message(run, `Hint ${level + 1}/${track.length}: ${track[level]}`);
}
function execute(run: Run, command: TargetCommand) {
  if (!visible(run, command.target)) return;
  if (command.verb === 'inspect') inspect(run, command.target);
  else if (command.verb === 'use') use(run, command.target, command.item);
  else interact(run, command.target);
}
export function dispatch(run: Run, command: Command) {
  if (run.status !== 'active') return;
  run.revision++;
  if (command.kind === 'next' || command.kind === 'skip') { advance(run, command.kind === 'skip'); return; }
  if (run.dialogue) return;
  if (command.kind === 'leave') { run.conversation = undefined; run.message = ''; return; }
  if (command.kind === 'topic') { topic(run, command.id); return; }
  if (command.kind === 'cancel') { run.pending = undefined; run.conversation = undefined; message(run, 'Action cancelled.'); return; }
  if (command.kind === 'hint') { requestHint(run); return; }
  if (command.kind === 'deduce') {
    run.pending = undefined;
    const definition = deductions[command.conclusion];
    const valid = command.evidence.length === definition.requires.length && definition.requires.every(id => command.evidence.includes(id) && has(run, id));
    if (valid) { flag(run, command.conclusion); run.events.push('discovery'); message(run, `Conclusion supported: ${definition.name}.`); }
    else message(run, definition.missing + ' Select the evidence you have actually discovered.');
    return;
  }
  if (command.kind === 'combine') {
    run.pending = undefined;
    if (!owns(run, command.first) || !owns(run, command.second)) return;
    if ([command.first, command.second].includes('brush') && [command.first, command.second].includes('poker')) {
      run.inventory.brush = 'consumed'; run.inventory.poker = 'consumed'; take(run, 'longBrush'); message(run, 'You fit the brush to the poker. Considerable reach, absolutely no prestige.');
    } else message(run, 'Those items have no useful connection. Neither is consumed.');
    return;
  }
  if (command.kind === 'tool') { run.pending = undefined; tool(run, command.item); return; }
  run.conversation = undefined;
  if (command.kind === 'target') {
    if (!visible(run, command.target)) return;
    if (command.verb === 'inspect') { run.pending = undefined; execute(run, command); return; }
    const path = route(run.actor, getTarget(command.target).at, rooms[run.room].floor);
    if (!path) { message(run, 'There is no clear approach to that target.'); return; }
    run.pending = { path, command }; message(run, `Approaching ${getTarget(command.target).name.toLowerCase()}…`);
  } else if (command.kind === 'walk') {
    const destination = project(command.point, rooms[run.room].floor), path = route(run.actor, destination, rooms[run.room].floor);
    run.pending = path ? { path, command: undefined } : undefined;
    message(run, path ? 'Walking…' : 'That part of the floor is not reachable.');
  }
}
export function stepRun(run: Run, dt: number) {
  if (run.status !== 'active' || !Number.isFinite(dt) || dt <= 0) return;
  const pending = run.pending;
  if (!pending || run.dialogue) return;
  const point = pending.path[0];
  if (!point) return;
  const dx = point.x - run.actor.x, dy = point.y - run.actor.y, distance = Math.hypot(dx, dy), travel = 290 * Math.min(dt, .1);
  if (dx) run.facing = Math.sign(dx);
  if (distance <= travel) {
    run.actor = { ...point }; pending.path.shift();
    if (!pending.path.length) { run.pending = undefined; run.revision++; if (pending.command) execute(run, pending.command); else message(run, 'Click an object or person to investigate.'); changed(run); }
  } else { run.actor.x += dx / distance * travel; run.actor.y += dy / distance * travel; }
}
export function takeEvents(run: Run) { return run.events.splice(0); }
