import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for full offline support and instant updates
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
