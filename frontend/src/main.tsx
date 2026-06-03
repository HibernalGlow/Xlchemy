import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from './i18n';
import App from './app';
import './input.css';

function main() {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('no root element');
  }
  initI18n();
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

main();
