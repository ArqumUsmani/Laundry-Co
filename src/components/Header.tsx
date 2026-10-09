import { useEffect, useRef, useState } from 'react';
import { site } from '../lib/site';
import { SoundButton, ThemeButton } from './Controls';
import { Mark } from './Mark';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#services', label: 'Services' },
  { href: '#press', label: 'Play' },
  { href: '#prices', label: 'Prices' },
  { href: '#visit', label: 'Visit' },
];

/** Hidden while the shop scene is on screen; appears once the visitor scrolls on. */
export function Header() {
  const bar = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const update = () => setHidden(window.scrollY < window.innerHeight * 0.7);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    // Let go of focus when the bar leaves, so it cannot hold itself open.
    if (hidden && bar.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  }, [hidden]);

  return (
    <header ref={bar} className={`site-header ${hidden ? 'is-hidden' : ''}`} inert={hidden}>
      <a className="brand" href="#top" aria-label={`${site.name}, back to the shop`}>
        <Mark />
        <span>{site.name}</span>
      </a>
      <nav aria-label="Sections">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <SoundButton />
        <ThemeButton />
        <a className="btn btn-accent btn-small" href={site.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp us">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5a8.5 8.5 0 00-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1012 3.500z" />
          </svg>
          <span>WhatsApp</span>
        </a>
      </div>
    </header>
  );
}
