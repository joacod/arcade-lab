import { mountClearing } from './app.ts';
import { createApplication } from './application.ts';
import './application.css';
import './style.css';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('Missing application container.');
const application = createApplication(container);
application.mount({ mount: mountClearing });
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => application.dispose());
}
