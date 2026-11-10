import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for full offline support and instant updates
registerSW({ immediate: true });

// Suppress benign abort errors from Firestore WebChannel streams closing and browser extensions
if (typeof window !== 'undefined') {
  const isIgnorableError = (msg: string) => {
    const lower = (msg || '').toLowerCase();
    return (
      lower.includes('aborterror') ||
      lower.includes('signal is aborted') ||
      lower.includes('aborted without reason') ||
      lower.includes('user aborted') ||
      lower.includes('websocket closed') ||
      lower.includes('cannot set property fetch')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason ? (reason.message || reason.name || String(reason)) : '';
    if (isIgnorableError(msg)) {
      event.preventDefault();
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      const msg =
        (event as any)?.message ||
        ((event as any)?.error ? (event as any).error.message || (event as any).error.name : '') ||
        String(event || '');
      if (isIgnorableError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);
