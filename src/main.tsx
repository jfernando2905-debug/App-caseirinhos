import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for full offline support and instant updates
registerSW({ immediate: true });

// Suppress benign abort errors from Firestore WebChannel streams closing and Vite HMR sandbox disconnects
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.name === 'AbortError' ||
        reason.message?.includes('signal is aborted without reason') ||
        reason.message?.includes('The user aborted a request') ||
        reason.message?.includes('WebSocket closed without opened'))
    ) {
      event.preventDefault();
      return;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
