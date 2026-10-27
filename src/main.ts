import { createApplication } from './application.ts';
import { mountSelection, type GameId } from './selection.ts';
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
    if (id === 'duel') {
      const { mountDuel } = await import('./fighter/app.ts');
      if (!disposed && request === generation) application.mount({ mount: host => mountDuel(host, showSelection) });
    } else if (id === 'skybreak') {
      const { mountSkybreak } = await import('./skybreak/app.ts');
      if (!disposed && request === generation) application.mount({ mount: host => mountSkybreak(host, showSelection) });
    } else if (id === 'circuit') {
      const { mountCircuit } = await import('./brawler/app.ts');
      if (!disposed && request === generation) application.mount({ mount: host => mountCircuit(host, showSelection) });
    } else if (id === 'hollow') {
      const { mountHollow } = await import('./platformer/app.ts');
      if (!disposed && request === generation) application.mount({ mount: host => mountHollow(host, showSelection) });
    } else {
      const { mountClearing } = await import('./app.ts');
      if (!disposed && request === generation) application.mount({ mount: host => mountClearing(host, showSelection) });
    }
  } catch { if (!disposed && request === generation) showSelection('This world could not open. Please try again.'); }
}
showSelection();
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { disposed = true; generation++; application.dispose(); });
}
