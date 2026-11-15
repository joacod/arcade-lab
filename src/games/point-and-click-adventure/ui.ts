import { rooms, items, itemIds, invitation, getTarget, evidence, deductions, type TargetId, type ItemId, type EvidenceId, type DeductionId } from './content.ts';
import { has, owns, roomTargets, topics, type Run, type Command } from './game.ts';
import { matchesEntry } from './journal.ts';
import { interaction } from './interaction.ts';
import { transform } from './presentation.ts';
import { bindingLabel, createKeyMap } from '../../engine/bindings.ts';
import { bindings } from './input.ts';
import { setAttribute, setText } from '../../common/ui/dom.ts';
export type Action = 'inventory' | 'casebook' | 'cancel';
type View = 'inventory' | 'casebook' | 'journal' | 'letter';
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
}
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, send: (command: Command) => void, itemIcon: (id: ItemId | 'satchel' | 'casebook') => HTMLCanvasElement | undefined) {
  let run: Run, item: ItemId | undefined, view: View | undefined;
  let inventoryItem: ItemId | undefined, inventoryResult = '';
  let combining = false, lastRevision = -1, selection = new Set<EvidenceId>(), connecting = false, deductionResult = '';
  let journalQuery = ''; const expandedEntries = new Set<number>();
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
  const targetButtons = new Map<TargetId, HTMLButtonElement>();
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
  scene.append(toolbar);
  function artworkChanged() {
    for (const [action, role] of [['inventory', 'satchel'], ['casebook', 'casebook']] as const) {
      const b = controls[action], icon = itemIcon(role);
      b.className = 'adventure-tool'; b.title = `${b.getAttribute('aria-label')} (${bindingLabel(bindings[action])})`;
      b.replaceChildren(); if (icon) b.append(icon);
      b.append(node('span', b.getAttribute('aria-label')!));
    }
  }
  const overlay = node('div', '', 'adventure-overlay'); overlay.hidden = true;
  const sheet = node('section', '', 'adventure-sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-labelledby', 'adventure-sheet-title');
  const sheetHeader = node('header'), sheetTitle = node('h2'); sheetTitle.id = 'adventure-sheet-title';
  const close = button('Close', 'close', () => closeView());
  const tabs = node('nav', '', 'adventure-tabs'); tabs.setAttribute('aria-label', 'Casebook sections');
  const evidenceTab = button('Evidence', 'evidence-tab', () => open('casebook'));
  const journalTab = button('Journal', 'journal-tab', () => open('journal')); tabs.append(evidenceTab, journalTab);
  const panel = node('div', '', 'adventure-panel');
  const caseActions = node('footer', '', 'adventure-case-actions');
  const search = node('input'); search.type = 'search'; search.placeholder = 'Person, place or words…'; search.setAttribute('aria-label', 'Search journal');
  const searchRow = node('label', '', 'adventure-journal-search'); searchRow.append(node('span', 'Search journal'), search);
  search.addEventListener('input', () => { journalQuery = search.value; refresh(true); });
  sheetHeader.append(sheetTitle, close); sheet.append(sheetHeader, tabs, searchRow, panel, caseActions); overlay.append(sheet);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeView(); });
  // Reading panels own pointer focus while their scene is inert. The shared HUD
  // fallback targets the playfield, which cannot receive focus behind a panel.
  for (const [area, destination] of [[overlay, sheet], [dialogue, dialogue]]) {
    destination!.tabIndex = -1;
    area!.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const target = event.target;
      if (target instanceof Element && target.closest('button:not(:disabled), input, select, textarea, summary, a, label')) return;
      event.preventDefault(); destination!.focus({ preventScroll: true });
    });
  }
  root.append(header, stage, overlay);
  function focus(element: HTMLElement | null | undefined) { element?.focus({ preventScroll: true }); }
  function open(next: View) {
    if (run.dialogue || run.conversation) return;
    if (run.pending) send({ kind: 'cancel' });
    const opening = !view;
    if (opening) opener = document.activeElement instanceof HTMLElement ? document.activeElement : surface;
    if (next !== 'inventory') { inventoryItem = undefined; combining = false; }
    else if (view !== 'inventory') { item = undefined; inventoryItem = undefined; combining = false; inventoryResult = ''; }
    view = next; refresh(true); if (opening) focus(close);
  }
  function closeView(restore = true) {
    view = undefined; inventoryItem = undefined; combining = false; refresh(true);
    if (restore) focus(opener?.isConnected && !opener.closest('[hidden]') ? opener : surface);
  }
  function activateTarget(id: TargetId) {
    if (run.dialogue || run.conversation || view) return;
    const command = interaction(run, id, item).command;
    // Item use is a single explicit action, never a sticky cursor mode.
    item = undefined; combining = false;
    send(command);
  }
  function chooseItem(id: ItemId) {
    if (combining && inventoryItem) {
      const first = inventoryItem; inventoryItem = undefined;
      send({ kind: 'combine', first, second: id }); inventoryResult = run.message;
      if (!owns(run, first) || !owns(run, id)) combining = false;
    } else if (combining) {
      inventoryItem = id; inventoryResult = '';
    } else {
      item = id; closeView(false); focus(surface); return;
    }
    refresh(true);
  }
  function refresh(force = false) {
    if (!run || !force && lastRevision === run.revision) return;
    lastRevision = run.revision;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusKey = focused?.dataset.focus;
    const ownedFocus = !!focused && [panel, caseActions, hotspots, selected, dialogue].some(container => container.contains(focused));
    if (inventoryItem && !owns(run, inventoryItem)) { inventoryItem = undefined; combining = false; }
    if (item && !owns(run, item)) { item = undefined; combining = false; }
    const talking = !!run.dialogue || !!run.conversation;
    if (talking) { view = undefined; item = undefined; combining = false; }
    location.textContent = rooms[run.room].name;
    narration.textContent = run.message; narration.hidden = !run.message || run.messageContext !== 'scene';
    close.textContent = view === 'letter' ? 'Begin investigation' : 'Close';
    overlay.hidden = !view; tabs.hidden = view !== 'casebook' && view !== 'journal'; searchRow.hidden = view !== 'journal';
    sheet.dataset.view = view ?? '';
    scene.inert = !!view; header.inert = !!view; surface.inert = talking;
    hotspots.inert = talking; hotspots.hidden = talking;
    feedback.hidden = talking || !!view;
    toolbar.inert = talking || !!view;
    controls.inventory.setAttribute('aria-expanded', String(view === 'inventory'));
    controls.casebook.setAttribute('aria-expanded', String(view === 'casebook' || view === 'journal'));
    // Larger targets are painted first. A higher z-index keeps a smaller neighbor
    // selectable; hover must not lift the larger target back over it.
    const targets = roomTargets(run).sort((a, b) => getTarget(b).w * getTarget(b).h - getTarget(a).w * getTarget(a).h);
    for (const [id, b] of targetButtons) if (!targets.includes(id)) { b.remove(); targetButtons.delete(id); }
    for (const [index, id] of targets.entries()) {
      const t = getTarget(id), action = interaction(run, id, item);
      let b = targetButtons.get(id);
      if (!b) {
        b = button('', `target-${id}`, () => activateTarget(id)); b.className = 'adventure-hotspot'; b.dataset.edge = t.x < 160 ? 'left' : t.x + t.w > 800 ? 'right' : '';
        b.append(node('span'));
        b.style.left = `${(t.x + t.w / 2) / 960 * 100}%`; b.style.top = `${(t.y + t.h / 2) / 540 * 100}%`;
        b.style.width = `${t.w / 960 * 100}%`; b.style.height = `${t.h / 540 * 100}%`;
        targetButtons.set(id, b); hotspots.append(b);
      }
      setAttribute(b, 'aria-label', action.label); setText(b.firstElementChild!, action.label);
      b.style.zIndex = String(index + 1);
    }
    selected.replaceChildren(); selected.hidden = !item && !['drawn', 'closed'].includes(run.lantern.phase);
    if (item) {
      const current = item;
      selected.append(node('strong', items[current].name));
      if (current === 'fork' && run.lantern.phase !== 'closed') selected.append(button('Sound fork', 'tool-fork', () => { item = undefined; send({ kind: 'tool', item: 'fork' }); }));
    }
    // Surface the equipment's next physical action at the moment it matters.
    if (run.lantern.phase === 'drawn') selected.append(button('Close lantern shutter', 'tool-lantern', () => { item = undefined; send({ kind: 'tool', item: 'lantern' }); }));
    if (run.lantern.phase === 'closed') selected.append(button('Sound tuning fork', 'tool-fork', () => { item = undefined; send({ kind: 'tool', item: 'fork' }); }));
    if (item) selected.append(controls.cancel);
    panel.replaceChildren(); caseActions.replaceChildren(); caseActions.hidden = view !== 'casebook' && view !== 'inventory';
    if (view === 'inventory') {
      sheetTitle.textContent = combining && inventoryItem ? `Combine ${items[inventoryItem].name} with…` : 'Inventory';
      panel.append(node('p', `Spirit lantern: ${run.lantern.occupant === 'empty' ? 'empty' : `${run.lantern.occupant} · ${run.lantern.phase}`}`, 'adventure-lantern'));
      const grid = node('div', '', 'adventure-items');
      for (const id of itemIds.filter(id => owns(run, id))) {
        const b = button('', `item-${id}`, () => chooseItem(id)); b.setAttribute('aria-label', items[id].name);
        const copy = node('div'); copy.append(node('strong', items[id].name), node('small', items[id].description));
        const icon = itemIcon(id); if (icon) b.append(icon);
        b.append(copy); b.disabled = combining && id === inventoryItem; b.setAttribute('aria-pressed', String(id === inventoryItem)); grid.append(b);
      }
      panel.append(grid);
      caseActions.append(node('p', combining ? inventoryItem ? `Choose an item to combine with ${items[inventoryItem].name}.` : 'Choose the first item to combine.' : 'Select an item to use in the scene.', 'adventure-selection-count'));
      const combine = button(combining ? 'Cancel combination' : 'Combine items', 'combine', () => {
        combining = !combining; inventoryItem = undefined; inventoryResult = ''; refresh(true);
        if (combining) focus(panel.querySelector('button:not(:disabled)'));
      });
      combine.setAttribute('aria-pressed', String(combining)); caseActions.append(combine);
      if (inventoryResult) { const result = node('p', inventoryResult, 'adventure-case-result'); result.setAttribute('role', 'status'); caseActions.append(result); }
    } else if (view === 'letter') {
      sheetTitle.textContent = invitation.title;
      for (const line of invitation.lines) panel.append(node('p', line.text));
    } else if (view === 'casebook') {
      sheetTitle.textContent = 'Casebook'; evidenceTab.setAttribute('aria-pressed', 'true'); journalTab.setAttribute('aria-pressed', 'false');
      const found = (Object.keys(evidence) as EvidenceId[]).filter(id => has(run, id));
      if (!found.length) panel.append(node('p', 'No evidence collected.'));

      for (const id of found) {
        const card = connecting ? button('', `evidence-${id}`, () => {
          if (selection.has(id)) selection.delete(id); else if (selection.size < 2) selection.add(id);
          deductionResult = ''; refresh(true);
        }) : node('article');
        card.className = 'adventure-evidence';
        if (card instanceof HTMLButtonElement) {
          card.setAttribute('aria-pressed', String(selection.has(id)));
          card.setAttribute('aria-label', evidence[id].name);
          card.disabled = selection.size === 2 && !selection.has(id);
        }
        card.append(node('strong', evidence[id].name), node('small', evidence[id].source), node('p', evidence[id].text)); panel.append(card);
      }
      if (found.length >= 2) {
        if (connecting) {
          const submit = button('Make deduction', 'deduce', () => {
            send({ kind: 'deduce', evidence: [...selection] });
            deductionResult = run.message; connecting = false; selection.clear(); refresh(true);
          });
          submit.disabled = selection.size !== 2;
          caseActions.append(node('p', `Connect two clues · ${selection.size} of 2 selected`, 'adventure-selection-count'), submit,
            button('Back to evidence', 'stop-connecting', () => { connecting = false; selection.clear(); refresh(true); }));
        } else caseActions.append(button('Connect clues', 'connect-clues', () => { connecting = true; deductionResult = ''; refresh(true); }));
      }
      const established = (Object.keys(deductions) as DeductionId[]).filter(id => has(run, id));
      if (established.length) {
        panel.append(node('h3', 'Conclusions'));
        for (const id of established) {
          const conclusion = node('article', '', 'adventure-conclusion');
          conclusion.append(node('strong', deductions[id].name), node('small', deductions[id].requires.map(clue => evidence[clue].name).join(' + ')));
          panel.append(conclusion);
        }
      }
      if (deductionResult) { const result = node('p', deductionResult, 'adventure-case-result'); result.setAttribute('role', 'status'); caseActions.append(result); }
    } else if (view === 'journal') {
      sheetTitle.textContent = 'Casebook'; evidenceTab.setAttribute('aria-pressed', 'false'); journalTab.setAttribute('aria-pressed', 'true');
      const entries = run.journal.map((entry, index) => ({ entry, index })).reverse().filter(({ entry }) => matchesEntry(entry, journalQuery));
      if (!entries.length) panel.append(node('p', run.journal.length ? 'No matching entries.' : 'No conversations recorded.'));
      for (const { entry, index } of entries) {
        const detail = node('details', '', 'adventure-journal-entry'), summary = node('summary'); summary.dataset.focus = `journal-${index}`;
        summary.append(node('strong', entry.title));
        if (entry.room) summary.append(node('small', rooms[entry.room].name));
        detail.open = expandedEntries.has(index);
        detail.addEventListener('toggle', () => { if (!detail.isConnected) return; if (detail.open) expandedEntries.add(index); else expandedEntries.delete(index); });
        detail.append(summary);
        for (const line of entry.lines) { const p = node('p'); p.append(node('strong', `${line.speaker}: `), document.createTextNode(line.text)); detail.append(p); }
        panel.append(detail);
      }
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
      if (run.topicPath.length) choices.append(button('Back to other questions', 'back-topics', () => send({ kind: 'back' })));
      if (!choices.childElementCount) choices.append(node('p', 'No more questions for now.'));
      dialogue.append(choices, button('End conversation', 'leave', () => send({ kind: 'leave' })));
    }
    const startedDialogue = !!run.dialogue && !hadDialogue, startedTopics = !!run.conversation && !run.dialogue && (hadDialogue || !hadConversation);
    const endedConversation = !talking && (hadDialogue || hadConversation);
    hadDialogue = !!run.dialogue; hadConversation = !!run.conversation;
    if (root.dataset.screen === 'playing') {
      if (startedDialogue || startedTopics) focus(dialogue.querySelector('button'));
      else if (endedConversation) focus(surface);
      else if (ownedFocus) {
        const replacement = focusKey ? root.querySelector<HTMLElement>(`[data-focus="${focusKey}"]`) : null;
        focus(replacement?.isConnected && !replacement.closest('[hidden], [inert]') && !(replacement instanceof HTMLButtonElement && replacement.disabled) ? replacement : view ? panel.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? caseActions.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? close : talking ? dialogue.querySelector('button') : surface);
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
    if (event.target instanceof HTMLElement && event.target.closest('input:not([type=checkbox]), textarea, select, [contenteditable]')) return;
    const shortcut = shortcuts.get(event.code);
    if (shortcut) {
      event.preventDefault();
      if (!event.repeat) controls[shortcut].click();
      return;
    }
  }, { signal });
  function action(action: Action) {
    if (action === 'cancel') {
      if (view) { inventoryItem = undefined; combining = false; refresh(true); return; }
      item = undefined; combining = false; send({ kind: 'cancel' }); refresh(true); focus(surface); }
    else if (view === action || action === 'casebook' && view === 'journal') closeView();
    else open(action);
  }
  signal.addEventListener('abort', () => { observer.disconnect(); root.replaceChildren(); }, { once: true });
  return { header, stage, scene, overlay, feedback, dialogue, toolbar, pause, controls, artworkChanged,
    showLetter() { open('letter'); },
    focusPlay() { focus(view ? close : run.dialogue || run.conversation ? dialogue.querySelector('button') : surface); },
    update(next: Run, force = false) { run = next; refresh(force); },
    reset() { item = undefined; inventoryItem = undefined; inventoryResult = ''; combining = false; selection = new Set(); connecting = false; deductionResult = ''; journalQuery = ''; search.value = ''; expandedEntries.clear(); view = undefined; lastRevision = -1; hadDialogue = false; hadConversation = false; },
    action,
  };
}
