import { rooms, items, itemIds, getTarget, evidence, deductions, type TargetId, type ItemId, type EvidenceId, type DeductionId } from './content.ts';
import { has, owns, roomTargets, topics, type Run, type Command } from './game.ts';
import { interaction } from './interaction.ts';
import { transform } from './presentation.ts';
import { bindingLabel, createKeyMap } from '../../engine/bindings.ts';
import { bindings } from './input.ts';
export type Action = 'inventory' | 'casebook' | 'cancel';
type View = 'inventory' | 'casebook' | 'journal';
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
}
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, send: (command: Command) => void) {
  let run: Run, item: ItemId | undefined, view: View | undefined;
  let combining = false, lastRevision = -1, selection = new Set<EvidenceId>();
  let opener: HTMLElement | undefined, hadDialogue = false, hadConversation = false;
  function button(text: string, key: string, click?: () => void) {
    const b = node('button', text); b.type = 'button'; b.dataset.focus = key;
    if (click) b.addEventListener('click', click);
    return b;
  }
  const header = node('header', '', 'adventure-header');
  const location = node('strong'), pause = button('Pause', 'pause');
  const heading = node('div'); heading.append(location); header.append(heading, pause);
  const stage = node('div', '', 'adventure-stage'), scene = node('div', '', 'adventure-scene'); scene.append(surface); stage.append(scene);
  const hotspots = node('div', '', 'adventure-hotspots'); hotspots.setAttribute('aria-label', 'Scene actions'); hotspots.setAttribute('role', 'group'); scene.append(hotspots);
  const dialogue = node('section', '', 'adventure-dialogue'); dialogue.setAttribute('aria-label', 'Conversation'); dialogue.hidden = true;
  const feedback = node('div', '', 'adventure-feedback');
  const narration = node('p', '', 'adventure-narration'); narration.setAttribute('role', 'status');
  const selected = node('div', '', 'adventure-selected');
  feedback.append(narration, selected); scene.append(feedback, dialogue);
  const toolbar = node('nav', '', 'adventure-toolbar'); toolbar.setAttribute('aria-label', 'Investigation tools');
  const controls = {
    inventory: button('Inventory', 'inventory'), casebook: button('Casebook', 'casebook'),
    cancel: button('Cancel', 'cancel'),
  };
  for (const action of Object.keys(controls) as Action[]) {
    const b = controls[action], name = b.textContent!;
    b.setAttribute('aria-label', name);
    b.setAttribute('aria-keyshortcuts', bindingLabel(bindings[action]));
    b.textContent = `${name} (${bindingLabel(bindings[action])})`;
  }
  toolbar.append(controls.inventory, controls.casebook);
  const overlay = node('div', '', 'adventure-overlay'); overlay.hidden = true;
  const sheet = node('section', '', 'adventure-sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-labelledby', 'adventure-sheet-title');
  const sheetHeader = node('header'), sheetTitle = node('h2'); sheetTitle.id = 'adventure-sheet-title';
  const close = button('Close (Esc)', 'close', () => closeView()); close.setAttribute('aria-label', 'Close'); close.setAttribute('aria-keyshortcuts', 'Escape');
  const tabs = node('nav', '', 'adventure-tabs'); tabs.setAttribute('aria-label', 'Casebook sections');
  const evidenceTab = button('Evidence', 'evidence-tab', () => open('casebook'));
  const journalTab = button('Journal', 'journal-tab', () => open('journal')); tabs.append(evidenceTab, journalTab);
  const panel = node('div', '', 'adventure-panel');
  sheetHeader.append(sheetTitle, close); sheet.append(sheetHeader, tabs, panel); overlay.append(sheet); stage.append(overlay);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeView(); });
  root.append(header, stage, toolbar);
  function focus(element: HTMLElement | null | undefined) { element?.focus({ preventScroll: true }); }
  function open(next: View) {
    if (run.dialogue || run.conversation) return;
    const opening = !view;
    if (opening) opener = document.activeElement instanceof HTMLElement ? document.activeElement : surface;
    view = next; refresh(true); if (opening) focus(close);
  }
  function closeView(restore = true) {
    view = undefined; combining = false; refresh(true);
    if (restore) focus(opener?.isConnected && !opener.closest('[hidden]') ? opener : surface);
  }
  function activateTarget(id: TargetId) {
    if (run.dialogue || run.conversation || view) return;
    const command = interaction(run, id, item).command;
    // Item use is a single explicit action, never a sticky cursor mode.
    item = undefined; combining = false;
    send(command); refresh(true);
  }
  function chooseItem(id: ItemId) {
    if (combining && item) {
      const first = item; item = undefined; combining = false;
      send({ kind: 'combine', first, second: id }); refresh(true);
    } else {
      item = id; view = undefined; combining = false; refresh(true); focus(surface);
    }
  }
  function refresh(force = false) {
    if (!run || !force && lastRevision === run.revision) return;
    lastRevision = run.revision;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusKey = focused?.dataset.focus;
    const ownedFocus = !!focused && [panel, hotspots, selected, dialogue].some(container => container.contains(focused));
    if (item && !owns(run, item)) { item = undefined; combining = false; }
    const talking = !!run.dialogue || !!run.conversation;
    if (talking) { view = undefined; item = undefined; combining = false; }
    location.textContent = rooms[run.room].name;
    narration.textContent = run.message; narration.hidden = !run.message;
    overlay.hidden = !view; tabs.hidden = view !== 'casebook' && view !== 'journal';
    scene.inert = !!view; surface.inert = talking;
    hotspots.inert = talking; hotspots.hidden = talking;
    feedback.hidden = talking;
    toolbar.inert = talking;
    controls.inventory.setAttribute('aria-expanded', String(view === 'inventory'));
    controls.casebook.setAttribute('aria-expanded', String(view === 'casebook' || view === 'journal'));
    hotspots.replaceChildren();
    // Smaller overlapping targets (e.g. the Guest inside the bell) stay on top.
    const targets = roomTargets(run).sort((a, b) => getTarget(b).w * getTarget(b).h - getTarget(a).w * getTarget(a).h);
    for (const id of targets) {
      const t = getTarget(id), action = interaction(run, id, item);
      const b = button('', `target-${id}`, () => activateTarget(id)); b.className = 'adventure-hotspot'; b.dataset.edge = t.x < 160 ? 'left' : t.x + t.w > 800 ? 'right' : ''; b.setAttribute('aria-label', action.label);
      const label = node('span', action.label); b.append(label);
      b.style.left = `${(t.x + t.w / 2) / 960 * 100}%`; b.style.top = `${(t.y + t.h / 2) / 540 * 100}%`;
      b.style.width = `${t.w / 960 * 100}%`; b.style.height = `${t.h / 540 * 100}%`;
      hotspots.append(b);
    }
    selected.replaceChildren(); selected.hidden = !item && !run.pending && !['drawn', 'closed'].includes(run.lantern.phase);
    if (item) {
      const current = item;
      selected.append(node('strong', items[current].name));
      selected.append(button('Combine…', 'combine', () => { combining = true; open('inventory'); }));
      if (current === 'fork' && run.lantern.phase !== 'closed') selected.append(button('Sound fork', 'tool-fork', () => { item = undefined; send({ kind: 'tool', item: 'fork' }); }));
    }
    // Surface the equipment's next physical action at the moment it matters.
    if (run.lantern.phase === 'drawn') selected.append(button('Close lantern shutter', 'tool-lantern', () => { item = undefined; send({ kind: 'tool', item: 'lantern' }); }));
    if (run.lantern.phase === 'closed') selected.append(button('Sound tuning fork', 'tool-fork', () => { item = undefined; send({ kind: 'tool', item: 'fork' }); }));
    if (item || run.pending) selected.append(controls.cancel);
    panel.replaceChildren();
    if (view === 'inventory') {
      sheetTitle.textContent = combining && item ? `Combine ${items[item].name} with…` : 'Inventory';
      panel.append(node('p', `Spirit lantern: ${run.lantern.occupant === 'empty' ? 'empty' : `${run.lantern.occupant} · ${run.lantern.phase}`}`, 'adventure-lantern'));
      const grid = node('div', '', 'adventure-items');
      for (const id of itemIds.filter(id => owns(run, id))) {
        const b = button('', `item-${id}`, () => chooseItem(id)); b.setAttribute('aria-label', items[id].name);
        b.append(node('strong', items[id].name), node('small', items[id].description)); b.disabled = combining && id === item; grid.append(b);
      }
      panel.append(grid);
    } else if (view === 'casebook') {
      sheetTitle.textContent = 'Casebook'; evidenceTab.setAttribute('aria-pressed', 'true'); journalTab.setAttribute('aria-pressed', 'false');
      const found = (Object.keys(evidence) as EvidenceId[]).filter(id => has(run, id));
      if (!found.length) panel.append(node('p', 'No evidence collected.'));
      for (const id of found) {
        const label = node('label', '', 'adventure-evidence'), check = node('input'); check.type = 'checkbox'; check.checked = selection.has(id); check.dataset.focus = `evidence-${id}`;
        check.addEventListener('change', () => { if (check.checked) selection.add(id); else selection.delete(id); refresh(true); });
        const copy = node('span'); copy.append(node('strong', evidence[id].name), node('small', evidence[id].text)); label.append(check, copy); panel.append(label);
      }
      if (found.length) {
        panel.append(node('p', `${selection.size} of 2 clues selected`, 'adventure-selection-count'));
        for (const id of Object.keys(deductions) as DeductionId[]) {
          const b = button(`${has(run, id) ? '✓ ' : 'Propose: '}${deductions[id].name}`, `deduce-${id}`, () => { send({ kind: 'deduce', conclusion: id, evidence: [...selection] }); });
          b.disabled = has(run, id) || selection.size !== 2; panel.append(b);
        }
      }
      const result = node('p', run.message, 'adventure-case-result'); result.hidden = !run.message; result.setAttribute('role', 'status'); panel.append(result);
    } else if (view === 'journal') {
      sheetTitle.textContent = 'Casebook'; evidenceTab.setAttribute('aria-pressed', 'false'); journalTab.setAttribute('aria-pressed', 'true');
      if (!run.transcript.length) panel.append(node('p', 'No conversations recorded.'));
      for (const line of run.transcript.slice().reverse()) { const p = node('p'); p.append(node('strong', `${line.speaker}: `), document.createTextNode(line.text)); panel.append(p); }
    }
    dialogue.replaceChildren(); dialogue.hidden = !talking;
    if (run.dialogue) {
      const line = run.dialogue.lines[run.dialogue.index]!;
      dialogue.append(node('strong', line.speaker), node('p', line.text));
      const buttons = node('div', '', 'adventure-dialogue-actions'); buttons.append(button(run.dialogue.index + 1 < run.dialogue.lines.length ? 'Next' : 'Continue', 'next', () => send({ kind: 'next' })));
      if (run.dialogue.scene) buttons.append(button('Skip scene', 'skip', () => send({ kind: 'skip' })));
      dialogue.append(buttons);
    } else if (run.conversation) {
      dialogue.append(node('strong', getTarget(run.conversation).name));
      const choices = node('div', '', 'adventure-topics');
      for (const t of topics(run, run.conversation)) choices.append(button(t.label, t.id, () => send({ kind: 'topic', id: t.id })));
      dialogue.append(choices, button('End conversation', 'leave', () => send({ kind: 'leave' })));
    }
    const startedDialogue = !!run.dialogue && !hadDialogue, startedTopics = !!run.conversation && !run.dialogue && hadDialogue;
    const endedConversation = !talking && (hadDialogue || hadConversation);
    hadDialogue = !!run.dialogue; hadConversation = !!run.conversation;
    if (root.dataset.screen === 'playing') {
      if (startedDialogue || startedTopics) focus(dialogue.querySelector('button'));
      else if (endedConversation) focus(surface);
      else if (ownedFocus) {
        const replacement = focusKey ? root.querySelector<HTMLElement>(`[data-focus="${focusKey}"]`) : null;
        focus(replacement?.isConnected && !replacement.closest('[hidden], [inert]') && !(replacement instanceof HTMLButtonElement && replacement.disabled) ? replacement : view ? panel.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? close : talking ? dialogue.querySelector('button') : surface);
      }
    }
  }
  const observer = new ResizeObserver(entries => {
    const box = entries[0]!.contentRect, view = transform(box.width, box.height);
    hotspots.style.left = `${view.x}px`; hotspots.style.top = `${view.y}px`; hotspots.style.width = `${960 * view.scale}px`; hotspots.style.height = `${540 * view.scale}px`;
  }); observer.observe(scene);
  const shortcuts = createKeyMap(bindings);
  root.addEventListener('keydown', event => {
    if (root.dataset.screen !== 'playing' || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const shortcut = shortcuts.get(event.code);
    if (shortcut) {
      event.preventDefault();
      if (!event.repeat) controls[shortcut].click();
      return;
    }
    if (event.repeat || event.code !== 'Escape') return;
    if (view) { event.preventDefault(); closeView(); }
    else if (item || run.pending) { event.preventDefault(); action('cancel'); }
    else if (run.conversation && !run.dialogue) { event.preventDefault(); send({ kind: 'leave' }); }
  }, { signal });
  function action(action: Action) {
    if (action === 'cancel') { item = undefined; combining = false; send({ kind: 'cancel' }); refresh(true); focus(surface); }
    else if (view === action || action === 'casebook' && view === 'journal') closeView();
    else open(action);
  }
  signal.addEventListener('abort', () => { observer.disconnect(); root.replaceChildren(); }, { once: true });
  return { header, stage, scene, overlay, feedback, dialogue, toolbar, pause, controls,
    focusPlay() { focus(view ? close : run.dialogue || run.conversation ? dialogue.querySelector('button') : surface); },
    update(next: Run, force = false) { run = next; refresh(force); },
    reset() { item = undefined; combining = false; selection = new Set(); view = undefined; lastRevision = -1; hadDialogue = false; hadConversation = false; },
    action,
  };
}
