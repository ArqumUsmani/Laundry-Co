import { useRef, useState } from 'react';
import { announce } from '../lib/announce';
import { gsap, useGSAP } from '../lib/gsap-setup';
import { motion } from '../lib/motion-guard';
import { sfx } from '../lib/sound';

// Uneven creases drawn over the shirt; pressing wipes them away left to right.
const CREASES = [
  'M70 150c40 22 62-18 104 6s58-12 96 4',
  'M96 232c30-20 52 16 88-2s50 14 92-6',
  'M60 318c44 18 70-22 112 0s64-10 108 8',
  'M120 96c22 14 40-10 64 2',
  'M206 188c18-12 36 10 60-2',
  'M88 380c36-14 60 12 98-4s44 12 78 0',
  'M150 276c20 10 34-8 54 2',
  'M236 340c16-10 30 8 48-2',
];

/** One tap: the iron glides over the shirt, steam rises, the creases are gone. */
export function IronPlay() {
  const root = useRef<HTMLButtonElement>(null);
  const [pressed, setPressed] = useState(false);
  const busy = useRef(false);

  const { contextSafe } = useGSAP(
    () => {
      gsap.set('.iron', { xPercent: -120, yPercent: -40, opacity: 0 });
      gsap.set('.crisp-tag', { scale: 0 });
    },
    { scope: root },
  );

  const press = contextSafe(() => {
    if (busy.current) return;

    if (pressed) {
      // Crumple it again so the trick can be replayed.
      setPressed(false);
      announce('The shirt is creased again.');
      sfx.flip();
      if (motion.reduced) {
        gsap.set(['.crease-clip', '.crease-inner'], { xPercent: 0 });
        gsap.set('.crisp-tag', { scale: 0 });
        return;
      }
      gsap.to('.crisp-tag', { scale: 0, duration: 0.2, ease: 'power2.in' });
      gsap.set(['.crease-clip', '.crease-inner'], { xPercent: 0 });
      gsap.fromTo('.creases', { opacity: 0 }, { opacity: 1, duration: 0.4 });
      gsap.fromTo('.shirt-wrap', { scale: 0.9, rotation: -4 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
      return;
    }

    setPressed(true);
    announce('The shirt is pressed. Crisp.');
    if (motion.reduced) {
      gsap.set('.crease-clip', { xPercent: 100 });
      gsap.set('.crisp-tag', { scale: 1 });
      return;
    }

    busy.current = true;
    const stage = root.current!;
    const puff = (at: number) => {
      const el = document.createElement('i');
      el.className = 'steam-puff';
      stage.appendChild(el);
      gsap.fromTo(
        el,
        { left: `${at}%`, top: '48%', scale: 0.4, opacity: 0.8, xPercent: -50, yPercent: -50 },
        { scale: 2.2, opacity: 0, yPercent: -260, duration: 1.2, ease: 'power2.out', onComplete: () => el.remove() },
      );
    };

    gsap
      .timeline({ onComplete: () => void (busy.current = false) })
      .set('.iron', { xPercent: -120, yPercent: -40, rotation: -8, opacity: 1 })
      .to('.iron', { xPercent: -20, rotation: 0, duration: 0.45, ease: 'back.out(1.6)' })
      .call(() => sfx.steam(), [], 0.4)
      .to('.iron', { xPercent: 140, duration: 1.3, ease: 'power2.inOut' }, 0.5)
      // The clip slides right while its contents slide back, so creases vanish behind the iron.
      .to('.crease-clip', { xPercent: 100, duration: 1.3, ease: 'power2.inOut' }, 0.5)
      .to('.crease-inner', { xPercent: -100, duration: 1.3, ease: 'power2.inOut' }, 0.5)
      .call(() => puff(28), [], 0.75)
      .call(() => puff(52), [], 1.1)
      .call(() => puff(76), [], 1.45)
      .to('.iron', { xPercent: 190, yPercent: -90, rotation: 10, opacity: 0, duration: 0.4, ease: 'power2.in' }, 1.8)
      .fromTo('.shirt-wrap', { scale: 1.04 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, 1.85)
      .call(() => sfx.sparkle(), [], 1.9)
      .to('.crisp-tag', { scale: 1, rotation: -8, duration: 0.5, ease: 'back.out(2)' }, 1.9);
  });

  return (
    <button ref={root} type="button" className="press-stage" onClick={press} aria-label={pressed ? 'Crumple the shirt again' : 'Press the shirt'} data-cursor="play">
      <span className="board-pad" />
      <span className="shirt-wrap">
        <img src="/img/shirt.webp" alt="" width={450} height={392} loading="lazy" decoding="async" />
        <span className="creases">
          <span className="crease-clip">
            <span className="crease-inner">
              <svg viewBox="0 0 340 460" preserveAspectRatio="none" aria-hidden="true">
                {CREASES.map((d) => (
                  <g key={d}>
                    <path className="crease-dark" d={d} />
                    <path className="crease-light" d={d} transform="translate(0 5)" />
                  </g>
                ))}
              </svg>
            </span>
          </span>
        </span>
      </span>
      <img className="iron" src="/img/iron.webp" alt="" width={190} height={123} loading="lazy" decoding="async" />
      <span className="crisp-tag">Crisp.</span>
      <span className="press-hint">{pressed ? 'Tap to crumple it again' : 'Tap the shirt to press it'}</span>
    </button>
  );
}
