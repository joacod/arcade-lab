import { createApplication } from './application.ts';
import { mountSelection, type SelectionState } from './selection.ts';
import { games, type GameId } from './catalog.ts';
import type { GameInfo } from './catalog-data.ts';
import { gameAtPath, gamePath } from './routes.ts';
import { pageMetadata } from './site.ts';
import { gameLoadingMarkup } from './game-loading-markup.ts';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('Missing application container.');
const application = createApplication(container);
let generation = 0, disposed = false;
const selection: SelectionState = { scrollTop: 0 };
const lifetime = new AbortController();

function updateMetadata(game?: GameInfo) {
  const page = pageMetadata(game);
  document.title = page.title;
  document.querySelector('meta[name="description"]')!.setAttribute('content', page.description);
  document.querySelector('link[rel="canonical"]')!.setAttribute('href', page.url);
  for (const [property, value] of Object.entries(page.openGraph)) document.querySelector(`meta[property="${property}"]`)!.setAttribute('content', value);
  for (const [name, value] of Object.entries(page.twitter)) document.querySelector(`meta[name="${name}"]`)!.setAttribute('content', value);
  document.querySelector('script[type="application/ld+json"]')!.textContent = JSON.stringify(page.schema);
}

function navigate(id?: GameId, keepSelection = false) {
  const game = games.find(game => game.id === id);
  const path = game ? gamePath(game) : '/';
  if (location.pathname !== path) history.pushState(null, '', path);
  renderRoute(undefined, keepSelection);
}

function showSelection(message = '', initialRoot?: HTMLElement) {
  if (disposed) return;
  generation++;
  application.mount({ mount: (host, fullscreen) => mountSelection(host, {
    select: id => navigate(id, true), cancel: () => navigate(), state: selection, message, fullscreen, initialRoot,
  }) });
}
async function selectGame(game: GameInfo) {
  const request = ++generation;
  try {
    const entry = games.find(entry => entry.id === game.id)!;
    const mount = await entry.load();
    if (!disposed && request === generation) application.mount({ mount: (host, fullscreen) => mount(host, () => navigate(), fullscreen) });
  } catch {
    if (!disposed && request === generation) {
      history.replaceState(null, '', '/');
      updateMetadata();
      showSelection('Could not load the game. Try again.');
    }
  }
}

/** Keep the server-rendered shell only when it already belongs to this route. */
function matchingShell(game: GameInfo | undefined, initialRoot?: HTMLElement) {
  if (initialRoot?.querySelector('h1')?.textContent === (game?.title ?? 'Press Play')) return initialRoot;
}

function renderRoute(initialRoot?: HTMLElement, keepSelection = false) {
  if (disposed) return;
  const game = gameAtPath(location.pathname);
  const shell = matchingShell(game, initialRoot);
  updateMetadata(game);
  if (!game) { showSelection('', shell); return; }
  selection.selected = game.id;
  if (!keepSelection) application.mount({ mount: host => {
    const root = shell ?? document.createElement('main');
    root.className = 'arcade-selection';
    if (!shell) root.innerHTML = gameLoadingMarkup(game);
    host.append(root);
    const loadingLifetime = new AbortController();
    root.querySelector<HTMLAnchorElement>('a[href="/"]')?.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); navigate();
    }, { signal: loadingLifetime.signal });
    return { dispose() { loadingLifetime.abort(); root.remove(); } };
  } });
  void selectGame(game);
}

window.addEventListener('popstate', () => renderRoute(), { signal: lifetime.signal });
// Retain the initial HTML and already loading previews on a collection visit.
renderRoute(container.querySelector<HTMLElement>('.arcade-selection') ?? undefined);
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { disposed = true; generation++; lifetime.abort(); application.dispose(); });
}
