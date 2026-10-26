import { mountClearing } from './app.ts';
import './style.css';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('Missing application container.');
const session = mountClearing(container);
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => session.dispose());
}
