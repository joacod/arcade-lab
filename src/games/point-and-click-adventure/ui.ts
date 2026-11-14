import { rooms, items, itemIds, getTarget, evidence, deductions, type TargetId, type ItemId, type EvidenceId, type DeductionId } from './content.ts';
import { has, owns, objective, roomTargets, topics, type Run, type Command } from './game.ts';
export type Action = 'inspect' | 'interact' | 'use' | 'reveal' | 'cancel';
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
}
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, send: (command: Command) => void, save: () => void) {
  const header = node('header', '', 'adventure-header');
  const identity = node('div'); identity.append(node('strong', 'The Thirteenth Guest'), node('small', 'A BLACKTHORN CASE · PROTOTYPE'));
  const goal = node('p', '', 'adventure-objective'), pause = node('button', 'Pause'); pause.type = 'button'; header.append(identity, goal, pause);
  const stage = node('div', '', 'adventure-stage'), scene = node('div', '', 'adventure-scene'); scene.append(surface);
  const dialogue = node('section', '', 'adventure-dialogue'); dialogue.setAttribute('aria-label', 'Conversation'); dialogue.hidden = true; scene.append(dialogue);
  const sidebar = node('aside', '', 'adventure-sidebar'); sidebar.setAttribute('aria-label', 'Investigation');
  const tabs = node('nav', '', 'adventure-tabs'); tabs.setAttribute('aria-label', 'Investigation views');
  const panel = node('div', '', 'adventure-panel');
  const actions = node('div', '', 'adventure-actions');
  const controls = Object.fromEntries((['inspect', 'interact', 'use', 'reveal', 'cancel'] as Action[]).map(action => {
    const b = node('button', { inspect: 'Look · L', interact: 'Interact · E', use: 'Use item · U', reveal: 'Show hotspots · H', cancel: 'Cancel · X' }[action]); b.type = 'button'; actions.append(b); return [action, b];
  })) as Record<Action, HTMLButtonElement>;
  sidebar.append(tabs, panel, actions); stage.append(scene, sidebar);
  const narration = node('div', '', 'adventure-narration'); narration.setAttribute('role', 'status');
  const inventory = node('section', '', 'adventure-inventory'); inventory.setAttribute('aria-label', 'Detective’s case');
  const tools = node('div', '', 'adventure-utilities'), status = node('small', '', 'adventure-save-status'); status.setAttribute('role', 'status');
  const hint = button('A little help', 'hint', () => send({ kind: 'hint' }));
  tools.append(hint, button('Save adventure', 'save', save), status);
  root.append(header, stage, narration, inventory, tools);
  let run: Run, target: TargetId | undefined, item: ItemId | undefined, tab: 'room' | 'casebook' | 'journal' = 'room';
  let combining = false, reveal = false, lastRevision = -1, oldRoom = '', selection = new Set<EvidenceId>();
  function button(text: string, key: string, click: () => void) {
    const b = node('button', text); b.type = 'button'; b.dataset.focus = key;
    // Rebuilt controls own their listeners; the whole subtree is released on disposal.
    b.addEventListener('click', click); return b;
  }
  const tabButtons = (['room', 'casebook', 'journal'] as const).map(id => {
    const b = button({ room: 'Room', casebook: 'Casebook', journal: 'Journal' }[id], `tab-${id}`, () => { tab = id; refresh(true); }); tabs.append(b); return { id, b };
  });
  function chooseTarget(id: TargetId) { target = id; tab = 'room'; refresh(true); }
  function chooseItem(id: ItemId) {
    if (combining && item) { const first = item; combining = false; send({ kind: 'combine', first, second: id }); }
    else { item = item === id ? undefined : id; combining = false; }
    refresh(true);
  }
  function refresh(force = false) {
    if (!run || !force && lastRevision === run.revision) return;
    lastRevision = run.revision;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusKey = focused?.dataset.focus, ownedFocus = !!focused && (panel.contains(focused) || inventory.contains(focused) || dialogue.contains(focused));
    if (oldRoom !== run.room) { target = undefined; oldRoom = run.room; tab = 'room'; }
    if (target && !roomTargets(run).includes(target)) target = undefined;
    if (item && !owns(run, item)) { item = undefined; combining = false; }
    goal.textContent = objective(run); narration.textContent = run.message;
    for (const { id, b } of tabButtons) b.setAttribute('aria-pressed', String(tab === id));
    panel.replaceChildren();
    if (tab === 'room') {
      panel.append(node('h2', rooms[run.room].name), node('p', rooms[run.room].subtitle, 'adventure-subtitle'));
      if (run.conversation && !run.dialogue) {
        panel.append(node('h3', `Speaking with ${getTarget(run.conversation).name}`));
        for (const t of topics(run, run.conversation)) panel.append(button(t.label, t.id, () => send({ kind: 'topic', id: t.id })));
        panel.append(button('End conversation', 'leave', () => send({ kind: 'leave' })));
      } else {
        const list = node('div', '', 'adventure-targets');
        for (const id of roomTargets(run)) {
          const definition = getTarget(id), b = button(`${definition.kind === 'exit' ? '↗ ' : ''}${definition.name}`, `target-${id}`, () => chooseTarget(id));
          b.setAttribute('aria-pressed', String(target === id)); b.disabled = !!run.dialogue; list.append(b);
        }
        panel.append(list);
      }
      panel.append(node('p', target ? `Selected: ${getTarget(target).name}` : 'Select something in the scene or this list.', 'adventure-selected'));
    } else if (tab === 'casebook') {
      panel.append(node('h2', 'Evidence & deductions'), node('p', 'Select the two clues that support a conclusion. A wrong theory never costs an item.', 'adventure-subtitle'));
      const found = (Object.keys(evidence) as EvidenceId[]).filter(id => has(run, id));
      if (!found.length) panel.append(node('p', 'Look closely, ask questions, and test your theories. Evidence will appear here.'));
      for (const id of found) {
        const label = node('label', '', 'adventure-evidence'), check = node('input'); check.type = 'checkbox'; check.checked = selection.has(id); check.dataset.focus = `evidence-${id}`;
        check.addEventListener('change', () => { if (check.checked) selection.add(id); else selection.delete(id); });
        const copy = node('span'); copy.append(node('strong', evidence[id].name), node('small', evidence[id].text)); label.append(check, copy); panel.append(label);
      }
      for (const id of Object.keys(deductions) as DeductionId[]) {
        const b = button(`${has(run, id) ? '✓ ' : 'Propose: '}${deductions[id].name}`, `deduce-${id}`, () => send({ kind: 'deduce', conclusion: id, evidence: [...selection] }));
        b.disabled = has(run, id) || !!run.dialogue; panel.append(b);
      }
    } else {
      panel.append(node('h2', 'Conversation journal'));
      if (!run.transcript.length) panel.append(node('p', 'Spoken lines are recorded here as you read them.'));
      for (const line of run.transcript.slice().reverse()) { const p = node('p'); p.append(node('strong', `${line.speaker}: `), document.createTextNode(line.text)); panel.append(p); }
    }
    controls.inspect.disabled = !target || !!run.dialogue;
    controls.interact.disabled = !target || !!run.dialogue;
    controls.interact.textContent = target ? `${target === 'tube' && has(run, 'tubeOpen') ? has(run, 'mechanism') ? 'Disconnect clock' : 'Test mechanism' : getTarget(target).action} · E` : 'Interact · E';
    controls.use.disabled = !target || !item || !!run.dialogue;
    controls.use.textContent = item ? `Use ${items[item].name} · U` : 'Use item · U';
    controls.reveal.setAttribute('aria-pressed', String(reveal));
    controls.cancel.disabled = !!run.dialogue;
    inventory.replaceChildren();
    const top = node('div', '', 'adventure-case-heading'); top.append(node('strong', 'WREN & CO.'), node('span', `Lantern: ${run.lantern.occupant === 'empty' ? 'empty' : `${run.lantern.occupant} · ${run.lantern.phase}`}`)); inventory.append(top);
    const tray = node('div', '', 'adventure-items');
    for (const id of itemIds.filter(id => owns(run, id))) {
      const b = button(items[id].name, `item-${id}`, () => chooseItem(id)); b.setAttribute('aria-pressed', String(item === id)); b.disabled = !!run.dialogue; tray.append(b);
    }
    inventory.append(tray);
    const detail = node('div', '', 'adventure-item-detail');
    if (item) {
      detail.append(node('span', combining ? 'Choose another item to combine with this one.' : items[item].description));
      const selected = item;
      if (item === 'lantern' || item === 'fork') detail.append(button(item === 'lantern' ? 'Close shutter' : 'Sound fork', 'tool', () => send({ kind: 'tool', item: selected })));
      detail.append(button(combining ? 'Stop combining' : 'Combine with…', 'combine', () => { combining = !combining; refresh(true); }));
    } else detail.append(node('span', 'Choose a tool, then a target and Use. Tap the floor to walk.'));
    for (const b of detail.querySelectorAll('button')) b.disabled = !!run.dialogue;
    inventory.append(detail);
    dialogue.replaceChildren(); dialogue.hidden = !run.dialogue;
    if (run.dialogue) {
      const line = run.dialogue.lines[run.dialogue.index]!;
      dialogue.append(node('strong', line.speaker), node('p', line.text));
      const buttons = node('div'); buttons.append(button(run.dialogue.index + 1 < run.dialogue.lines.length ? 'Next' : 'Continue', 'next', () => send({ kind: 'next' })));
      if (run.dialogue.scene) buttons.append(button('Skip scene', 'skip', () => send({ kind: 'skip' })));
      dialogue.append(buttons);
    }
    hint.disabled = !!run.dialogue;
    if (ownedFocus) {
      const replacement = focusKey ? root.querySelector<HTMLElement>(`[data-focus="${focusKey}"]`) : null;
      (replacement && !(replacement instanceof HTMLButtonElement && replacement.disabled) ? replacement : run.dialogue ? dialogue.querySelector('button') : panel.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? surface)?.focus({ preventScroll: true });
    }
  }
  signal.addEventListener('abort', () => { root.replaceChildren(); }, { once: true });
  return { header, stage, scene, sidebar, narration, inventory, tools, pause, controls,
    get target() { return target; }, get reveal() { return reveal; },
    selectTarget: chooseTarget,
    update(next: Run, force = false) { run = next; refresh(force); },
    reset() { target = undefined; item = undefined; combining = false; selection = new Set(); tab = 'room'; oldRoom = ''; lastRevision = -1; },
    status(text: string) { status.textContent = text; },
    action(action: Action) {
      if (action === 'reveal') { reveal = !reveal; refresh(true); }
      else if (action === 'cancel') { combining = false; send({ kind: 'cancel' }); }
      else if (target && action === 'use' && item) send({ kind: 'target', target, verb: 'use', item });
      else if (target && action !== 'use') send({ kind: 'target', target, verb: action });
    },
  };
}
