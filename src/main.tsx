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
    return (
      msg.includes('AbortError') ||
      msg.includes('signal is aborted without reason') ||
      msg.includes('The user aborted a request') ||
      msg.includes('WebSocket closed without opened') ||
      msg.includes('Cannot set property fetch')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason ? (reason.message || reason.name || String(reason)) : '';
    if (isIgnorableError(msg)) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error ? event.error.message : '');
    if (isIgnorableError(msg)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);
