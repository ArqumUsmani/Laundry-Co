import { useLayoutEffect, useRef, useState } from 'react';
import { HeroControls } from '../components/Controls';
import { announce } from '../lib/announce';
import { gsap, ScrollTrigger, SplitText, useGSAP } from '../lib/gsap-setup';
import { motion } from '../lib/motion-guard';
import { firePoppers } from '../lib/poppers';
import { setAmbienceLevel, setWashers, sfx } from '../lib/sound';
import { toggleTheme, useTheme } from '../lib/theme';
import { Machine, MACHINE_W } from './Machine';
import { Walker, type WalkSheet } from './Walker';
import './scene.css';

// The shop is drawn on a 1200 x 1000 board and scaled to the viewport, so every
// position below is in board units.
const BOARD_W = 1200;
const BOARD_H = 1000;
const MEZZANINE = 600;
const GROUND = 920;
const BASKET = { x: 421, y: 872 };

const UPPER = ['05', '06', '07', '08'].map((id, i) => ({ id, x: 396 + i * 104, floor: MEZZANINE, scale: 0.8 }));
const LOWER = ['01', '02', '03', '04'].map((id, i) => ({ id, x: 420 + i * 122, floor: GROUND, scale: 1 }));
const MACHINES = [...UPPER, ...LOWER];
const FULL_HOUSE_KEY = 'lc-full-house';

// Walk cycles, with the numbers scripts/walk-sheet.mjs printed for each strip.
const WALKS: Record<'staff' | 'woman' | 'man', WalkSheet> = {
  staff: { src: '/img/staff-walk.webp', frames: 20, aspect: 0.5765, stride: 0.688, cycleSeconds: 1.92, rest: [5, 15] },
  woman: { src: '/img/woman-walk.webp', frames: 20, aspect: 0.5762, stride: 0.727, cycleSeconds: 1.42, rest: [5, 15] },
  man: { src: '/img/man-walk.webp', frames: 20, aspect: 0.581, stride: 0.593, cycleSeconds: 1.33, rest: [6, 16] },
};

const BUBBLES = [
  { left: 8, size: 34, dur: 17, delay: -3 },
  { left: 19, size: 20, dur: 22, delay: -11 },
  { left: 31, size: 46, dur: 19, delay: -7 },
  { left: 46, size: 24, dur: 24, delay: -16 },
  { left: 58, size: 38, dur: 18, delay: -1 },
  { left: 69, size: 18, dur: 21, delay: -9 },
  { left: 81, size: 42, dur: 20, delay: -14 },
  { left: 92, size: 26, dur: 23, delay: -5 },
];

function Bubble({ left, size, dur, delay }: (typeof BUBBLES)[number]) {
  const [round, setRound] = useState(0);
  const [popped, setPopped] = useState(false);

  const pop = () => {
    if (popped) return;
    sfx.pop();
    setPopped(true);
    // Remount after the burst so a fresh bubble starts again from the bottom.
    window.setTimeout(() => {
      setPopped(false);
      setRound((n) => n + 1);
    }, 420);
  };

  return (
    <button
      key={round}
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      className={`sky-bubble ${popped ? 'is-popped' : ''}`}
      style={{ left: `${left}%`, width: size, height: size, animationDuration: `${dur}s`, animationDelay: round ? '0s' : `${delay}s` }}
      onPointerDown={pop}
      data-cursor="pop"
    >
      <i />
    </button>
  );
}

function Scooter() {
  const root = useRef<HTMLButtonElement>(null);

  const { contextSafe } = useGSAP(
    () => {
      const el = root.current!;
      if (motion.reduced) {
        gsap.set(el, { x: 1330 });
        return;
      }
      const ride = () => {
        const leftToRight = Math.random() > 0.35;
        gsap.set('.scooter-flip', { scaleX: leftToRight ? 1 : -1 });
        gsap.delayedCall(2.3, () => {
          if (window.scrollY < window.innerHeight * 0.5) sfx.putter(leftToRight);
        });
        gsap.fromTo(
          el,
          { x: leftToRight ? -1700 : 2800 },
          { x: leftToRight ? 2800 : -1700, duration: 9, ease: 'power1.inOut', onComplete: () => void gsap.delayedCall(gsap.utils.random(9, 18), ride) },
        );
      };
      gsap.set(el, { x: -1700 });
      gsap.delayedCall(4, ride);
    },
    { scope: root },
  );

  const honk = contextSafe(() => {
    sfx.horn();
    if (motion.reduced) return;
    gsap
      .timeline()
      .to('.scooter-hop', { rotation: -14, y: -10, duration: 0.22, ease: 'back.out(2)' })
      .to('.scooter-hop', { rotation: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  });

  return (
    <button ref={root} type="button" className="scooter" onClick={honk} tabIndex={-1} aria-label="Delivery scooter. Tap to honk" data-cursor="hi">
      <span className="scooter-flip">
        <span className="scooter-hop">
          <img src="/img/scooter.webp" alt="" width={170} height={164} draggable={false} />
        </span>
      </span>
    </button>
  );
}

export function ShopScene() {
  const hero = useRef<HTMLElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const basket = useRef<HTMLImageElement>(null);
  const running = useRef(0);
  const done = useRef(new Set<string>());
  const [doneCount, setDoneCount] = useState(0);
  const [catLine, setCatLine] = useState(false);
  const theme = useTheme();

  // Fit the board to the hero. Phones show the middle of the shop, larger.
  useLayoutEffect(() => {
    const el = hero.current!;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const portrait = w / h < 0.8;
      const street = gsap.utils.clamp(52, 96, h * 0.09);
      const headroom = portrait ? gsap.utils.clamp(120, 240, h * 0.22) : 18;
      const byWidth = portrait ? w / 720 : (w * 0.98) / BOARD_W;
      const scale = Math.min(byWidth, (h - street - headroom) / BOARD_H, 1.5);
      el.style.setProperty('--s', String(scale));
      el.style.setProperty('--street', `${street}px`);
      el.style.setProperty('--road-h', `${street / scale}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { contextSafe } = useGSAP(
    () => {
      // Sign letters rise once the splash has cleared.
      const split = SplitText.create('.sign-title', { type: 'chars' });
      const intro = gsap.timeline({ paused: true });
      if (!motion.reduced) {
        intro
          .from(split.chars, { yPercent: 70, opacity: 0, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.045 }, 0.1)
          .from('.sign-strap', { opacity: 0, y: 14, duration: 0.7 }, 0.75)
          .from('.hero-hud', { opacity: 0, y: 20, duration: 0.7, ease: 'back.out(1.6)' }, 1)
          .from('.sky-orb', { scale: 0, rotation: -60, duration: 0.9, ease: 'back.out(1.8)' }, 0.5);
      }
      const start = () => intro.play();
      if (document.getElementById('splash')) window.addEventListener('lc:ready', start, { once: true });
      else start();

      ScrollTrigger.create({
        trigger: hero.current,
        start: 'top top',
        end: 'bottom 35%',
        onLeave: () => setAmbienceLevel(0.3),
        onEnterBack: () => setAmbienceLevel(1),
      });

      return () => window.removeEventListener('lc:ready', start);
    },
    { scope: hero },
  );

  const onStart = () => {
    running.current += 1;
    setWashers(running.current);
  };

  const onDone = (id: string) => {
    // Reduced motion finishes a load without ever starting the wash loop.
    running.current = Math.max(0, running.current - (motion.reduced ? 0 : 1));
    setWashers(running.current);
    done.current.add(id);
    setDoneCount(done.current.size);
    if (done.current.size === MACHINES.length && !sessionStorage.getItem(FULL_HOUSE_KEY)) {
      sessionStorage.setItem(FULL_HOUSE_KEY, '1');
      window.setTimeout(() => {
        firePoppers();
        announce('Full house! Every machine has spun a load.');
      }, 900);
    }
  };

  const kickBasket = contextSafe(() => {
    gsap.fromTo(basket.current, { scaleY: 0.86, scaleX: 1.08 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)', overwrite: true });
  });

  const flickerSign = contextSafe(() => {
    sfx.buzz();
    if (motion.reduced) return;
    gsap
      .timeline()
      .to('.neon', { opacity: 0.25, duration: 0.05, ease: 'power2.in' })
      .to('.neon', { opacity: 1, duration: 0.07 })
      .to('.neon', { opacity: 0.4, duration: 0.05, delay: 0.08 })
      .to('.neon', { opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  });

  const switchSky = contextSafe(() => {
    toggleTheme();
    sfx.toggle();
    if (motion.reduced) return;
    gsap.fromTo('.sky-orb', { rotation: -90, scale: 0.6 }, { rotation: 0, scale: 1, duration: 0.9, ease: 'back.out(1.8)', overwrite: true });
  });

  const petCat = contextSafe(() => {
    sfx.purr();
    setCatLine(true);
    window.setTimeout(() => setCatLine(false), 2200);
    if (motion.reduced) return;
    gsap.fromTo('.cat img', { scaleY: 0.9, scaleX: 1.06 }, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: true });
  });

  const fullHouse = doneCount === MACHINES.length;

  return (
    <section ref={hero} className="hero" id="top" aria-label="The shop">
      <div className="sky" aria-hidden="true">
        <div className="stars" />
        <div className="cloud cloud-a" />
        <div className="cloud cloud-b" />
        <div className="cloud cloud-c" />
      </div>

      <button type="button" className="sky-orb" onClick={switchSky} aria-label={theme === 'dark' ? 'Moon. Switch to day' : 'Sun. Switch to night'} data-cursor="play">
        <span />
      </button>

      <div className="sky-bubbles">
        {BUBBLES.map((b) => (
          <Bubble key={b.left} {...b} />
        ))}
      </div>

      <div className="board" style={{ width: BOARD_W, height: BOARD_H }}>
        <div className="nb nb-left" aria-hidden="true" />
        <div className="nb nb-right" aria-hidden="true" />
        <div className="pave" aria-hidden="true" />
        <div className="shop-glow" aria-hidden="true" />

        {/* Interior, back to front */}
        <div className="wall wall-upper" aria-hidden="true" />
        <div className="wall wall-lower" aria-hidden="true" />
        <div className="floor" aria-hidden="true" />
        {[150, 350, 550, 750, 950].map((x) => (
          <i key={x} className="lamp" style={{ left: x, top: 311 }} aria-hidden="true" />
        ))}
        {[190, 470, 750].map((x) => (
          <i key={x} className="lamp" style={{ left: x, top: 633 }} aria-hidden="true" />
        ))}
        <div className="aircon" aria-hidden="true" />
        {MACHINES.map((m) => (
          <span key={m.id} className="plate" style={{ left: m.x + (MACHINE_W * m.scale) / 2 - 12, top: m.floor === MEZZANINE ? 424 : 706 }} aria-hidden="true">
            {m.id}
          </span>
        ))}

        {UPPER.map((m) => (
          <Machine key={m.id} {...m} basket={BASKET} fxRef={fx} onStart={onStart} onDone={onDone} onBasketKick={kickBasket} />
        ))}
        <Walker
          name="the shop attendant"
          sheet={WALKS.staff}
          height={180}
          floor={MEZZANINE + 2}
          range={[70, 1010]}
          start={860}
          pace={1}
          lines={['Salaam! We run the machines for you.', 'Premium detergent, every load.', 'Fresh towels, coming up!', 'Hygiene first. Always.']}
          className="walker-upper"
        />

        <svg className="structure" viewBox="0 0 1200 1000" aria-hidden="true">
          {/* Mezzanine slab and its railing */}
          <rect className="slab" x="40" y="600" width="1120" height="26" />
          <rect className="slab-edge" x="40" y="620" width="1120" height="6" />
          <g className="rail">
            <rect x="40" y="524" width="1120" height="5" rx="2.5" />
            <rect x="40" y="560" width="1120" height="3" />
            {[40, 180, 320, 460, 600, 740, 880, 1020, 1155].map((x) => (
              <rect key={x} x={x} y="524" width="5" height="76" />
            ))}
          </g>
          {/* Staircase up the right-hand side */}
          <polygon className="stringer" points="872,920 1146,622 1160,626 1160,652 912,920" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} className="tread" x={878 + i * 27} y={920 - (i + 1) * 29.4} width="42" height="6" rx="2" />
          ))}
          <g className="rail">
            <polygon points="872,846 1146,548 1150,552 876,850" />
            {[0, 3, 6, 9].map((i) => (
              <rect key={i} x={884 + i * 27} y={833 - i * 29.4} width="4" height="62" />
            ))}
          </g>
        </svg>

        <div className="shelf" aria-hidden="true">
          <i /><i /><i />
        </div>
        {LOWER.map((m) => (
          <Machine key={m.id} {...m} basket={BASKET} fxRef={fx} onStart={onStart} onDone={onDone} onBasketKick={kickBasket} />
        ))}

        <img className="prop sofa" src="/img/sofa.webp" alt="" width={320} height={141} />
        <button type="button" className="cat" onClick={petCat} aria-label="Sleeping cat. Give it a pat" data-cursor="hi">
          <img src="/img/cat.webp" alt="" width={78} height={48} />
          <span className={`speech ${catLine ? 'is-open' : ''}`} role="status">
            {catLine ? 'Purrr… zzz' : null}
          </span>
        </button>
        <img ref={basket} className="prop basket" src="/img/basket.webp" alt="" width={66} height={70} />
        <img className="prop plant" src="/img/plant.webp" alt="" width={135} height={260} />

        <Walker
          name="a customer"
          sheet={WALKS.woman}
          height={232}
          floor={GROUND + 10}
          range={[90, 900]}
          start={230}
          lines={['Half load today, 4 to 6 kg.', 'Back in time for chai.', 'Smells like fresh rain!', 'Wash, dry, done.']}
        />

        {/* Shopfront */}
        <div className="glass" aria-hidden="true" />
        <div className="pillar pillar-left" aria-hidden="true" />
        <div className="pillar pillar-right" aria-hidden="true" />
        <div className="louvre" aria-hidden="true" />
        <div className="sign">
          <h1 className="sign-title">
            <span className="sign-the">The</span> Laundry &amp; Co
          </h1>
          <p className="sign-strap">Fresh clothes, fresh life</p>
        </div>
        <button type="button" className="round-sign" onClick={flickerSign} aria-label="Laundromat, open 24/7 sign" data-cursor="play">
          <span className="neon">
            <small>Laundromat</small>
            <b>24/7</b>
          </span>
        </button>

        <img className="prop planter planter-left" src="/img/planter.webp" alt="" width={200} height={80} />
        <img className="prop planter planter-right" src="/img/planter.webp" alt="" width={200} height={80} />
        <Walker
          name="a passer-by"
          sheet={WALKS.man}
          height={244}
          floor={BOARD_H - 4}
          range={[-520, 1680]}
          start={-360}
          pause={[1, 3]}
          lines={['Open 24/7? Perfect.', "Dropping off the week's laundry.", 'They pick up and deliver too!']}
          className="walker-street"
        />
        <img className="prop tree" src="/img/tree.webp" alt="" width={400} height={641} />
        <Scooter />

        <div ref={fx} className="fx" aria-hidden="true" />
      </div>

      <div className="road" aria-hidden="true" />

      <div className="hero-hud">
        <p className="hud-hint">
          <span className="hud-dot" />
          {fullHouse ? 'Full house! Every machine has spun.' : 'Tap a machine to run a wash'}
        </p>
        <p className="hud-count" aria-label={`${doneCount} of ${MACHINES.length} machines have run`}>
          {MACHINES.map((m, i) => (
            <i key={m.id} className={i < doneCount ? 'is-on' : ''} />
          ))}
        </p>
      </div>

      <HeroControls />

      <a className="scroll-cue" href="#how" aria-label="Scroll to how it works">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </a>
    </section>
  );
}
