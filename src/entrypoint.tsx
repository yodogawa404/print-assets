import './page.css';
import './print.css';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { themeClass } from 'virtual:print-assets/config';

const root = document.getElementById('app');
if (!root) {
  throw new Error('#app element not found');
}

createRoot(root).render(<App themeClass={themeClass} />);
