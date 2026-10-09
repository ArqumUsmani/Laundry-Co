import { toggleMute, useMuted } from '../lib/sound';
import { toggleTheme, useTheme } from '../lib/theme';

export function SoundButton() {
  const muted = useMuted();
  return (
    <button type="button" className="icon-btn" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4.2 4.2 0 010 6M18 6.5a7.8 7.8 0 010 11" />}
      </svg>
    </button>
  );
}

export function ThemeButton() {
  const theme = useTheme();
  return (
    <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to day' : 'Switch to night'}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {theme === 'dark' ? (
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
          </>
        )}
      </svg>
    </button>
  );
}

/** The few controls the hero needs; they bow out when the header shows. */
export function HeroControls() {
  return (
    <div className="hero-controls">
      <SoundButton />
      <ThemeButton />
    </div>
  );
}
