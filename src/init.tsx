import './page.css';
import './print.css';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { themeClass } from 'virtual:print-assets/config';

export function init(element: HTMLElement) {
  if (!element) {
    throw new Error('element not found');
  }
  createRoot(element).render(<App themeClass={themeClass} />);
}
