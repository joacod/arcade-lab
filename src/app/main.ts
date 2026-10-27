import { createApplication } from './application.ts';
import { mountSelection } from './selection.ts';
import { games, type GameId } from './catalog.ts';
import './application.css';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('Missing application container.');
const application = createApplication(container);
let generation = 0, disposed = false;
function showSelection(message = '') {
  if (disposed) return;
  generation++;
  application.mount({ mount: host => mountSelection(host, selectGame, message) });
}
async function selectGame(id: GameId) {
  const request = ++generation;
  try {
    const entry = games.find(game => game.id === id)!;
    const mount = await entry.load();
    if (!disposed && request === generation) application.mount({ mount: host => mount(host, showSelection) });
  } catch { if (!disposed && request === generation) showSelection('This world could not open. Please try again.'); }
}
showSelection();
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { disposed = true; generation++; application.dispose(); });
}
