import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  registerSW({ immediate: true });
} catch {
  // Ignore if running in an environment without service worker support
}

createRoot(document.getElementById('root')!).render(<App />);

