import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The splash plays one full cycle even on an instant load, and never traps a slow one.
const SPLASH_MIN = 4200;
const SPLASH_CAP = 8000;
const HERO_IMAGES = ['staff-walk', 'woman-walk', 'man-walk', 'sofa', 'plant', 'planter', 'tree', 'basket', 'towels'];

const splash = document.getElementById('splash');
if (splash) {
  const started = (window as unknown as { __splashStart?: number }).__splashStart ?? performance.now();
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const images = HERO_IMAGES.map((name) => {
    const img = new Image();
    img.src = `/img/${name}.webp`;
    return img.decode().catch(() => undefined);
  });
  const ready = Promise.all([document.fonts?.ready, ...images]);

  void Promise.race([ready, wait(SPLASH_CAP)])
    .then(() => wait(Math.max(0, SPLASH_MIN - (performance.now() - started))))
    .then(() => {
      splash.classList.add('is-leaving');
      window.dispatchEvent(new Event('lc:ready'));
      setTimeout(() => splash.remove(), 900);
    });
}
