import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { initSentry } from './lib/sentry';
import './styles/globals.css';

// Lazy + no-op unless VITE_SENTRY_DSN is set; never blocks render.
void initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
