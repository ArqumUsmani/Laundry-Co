import { useRef, useState, type RefObject } from 'react';
import { announce } from '../lib/announce';
import { gsap, useGSAP } from '../lib/gsap-setup';
import { motion } from '../lib/motion-guard';
import { sfx } from '../lib/sound';

// Machine box in board units, before the slot's own scale.
export const MACHINE_W = 110;
export const MACHINE_H = 170;
const DOOR_CENTRE_Y = 86;
const WASH_SECONDS = 7;
const LOAD = ['tshirt', 'sock', 'kurta'] as const;

type Phase = 'idle' | 'loading' | 'washing' | 'fresh';

type Props = {
  id: string;
  /** Left edge and floor line of the slot, in board units. */
  x: number;
  floor: number;
  scale?: number;
  /** Where the laundry flies in from. */
  basket: { x: number; y: number };
  fxRef: RefObject<HTMLDivElement | null>;
  onStart: () => void;
  onDone: (id: string) => void;
  onBasketKick: () => void;
};

export function Machine({ id, x, floor, scale = 1, basket, fxRef, onStart, onDone, onBasketKick }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const display = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<Phase>('idle');
  const [phase, setPhaseState] = useState<Phase>('idle');

  const setPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  const door = { x: x + (MACHINE_W / 2) * scale, y: floor - (MACHINE_H - DOOR_CENTRE_Y) * scale };

  const { contextSafe } = useGSAP(
    () => {
      gsap.set('.m-water', { yPercent: 100 });
      gsap.set('.m-stack', { scale: 0, xPercent: -50 });
      gsap.set('.m-cloth', { opacity: 0 });
    },
    { scope: root },
  );

  const emit = (className: string, at: { x: number; y: number }, size: number) => {
    const el = document.createElement('i');
    el.className = className;
    el.style.width = el.style.height = `${size}px`;
    fxRef.current?.appendChild(el);
    gsap.set(el, { x: at.x, y: at.y, xPercent: -50, yPercent: -50 });
    return el;
  };

  const run = contextSafe(() => {
    if (phaseRef.current === 'loading' || phaseRef.current === 'washing') return;
    const q = gsap.utils.selector(root);

    if (motion.reduced) {
      // The outcome without the show: the load is simply done.
      gsap.set(q('.m-stack'), { scale: 1 });
      if (display.current) display.current.textContent = 'FRESH';
      setPhase('fresh');
      onDone(id);
      announce(`Machine ${id} finished a load. Fresh towels are ready.`);
      return;
    }

    setPhase('loading');
    announce(`Machine ${id} is loading.`);
    if (display.current) display.current.textContent = 'LOAD';
    sfx.beep();

    const glass = q('.m-glass');
    const tl = gsap.timeline();
    tl.to(q('.m-stack'), { scale: 0, duration: 0.2, ease: 'power2.in' }, 0)
      .call(() => sfx.doorOpen(), [], 0.05)
      .to(glass, { rotateY: -118, duration: 0.45, ease: 'back.out(1.6)' }, 0.05);

    // Three pieces arc from the basket into the drum.
    LOAD.forEach((name, i) => {
      const at = 0.36 + i * 0.17;
      tl.call(
        () => {
          const img = document.createElement('img');
          img.src = `/img/${name}.webp`;
          img.alt = '';
          img.className = 'fx-cloth';
          fxRef.current?.appendChild(img);
          const peak = Math.min(basket.y, door.y) - 70 - i * 14;
          gsap.set(img, { x: basket.x, y: basket.y, xPercent: -50, yPercent: -50, scale: 0.4, rotation: 0 });
          onBasketKick();
          sfx.whoosh();
          gsap
            .timeline({ onComplete: () => img.remove() })
            .to(img, { x: door.x, duration: 0.62, ease: 'power1.inOut' }, 0)
            .to(img, { y: peak, scale: 1, duration: 0.29, ease: 'power2.out' }, 0)
            .to(img, { y: door.y, scale: 0.42 * scale, duration: 0.33, ease: 'power2.in' }, 0.29)
            .to(img, { rotation: i % 2 ? -160 : 160, duration: 0.62, ease: 'power1.inOut' }, 0)
            .to(img, { opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.52)
            .call(() => sfx.drop(), [], 0.56);
        },
        [],
        at,
      )
        .to(q(`.m-cloth-${i}`), { opacity: 1, duration: 0.12 }, at + 0.56)
        .fromTo(q('.m-body'), { scaleY: 0.97, scaleX: 1.02 }, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1, 0.45)' }, at + 0.58);
    });

    const shut = 0.36 + LOAD.length * 0.17 + 0.62;
    tl.to(glass, { rotateY: 0, duration: 0.22, ease: 'power2.in' }, shut)
      .call(() => sfx.doorShut(), [], shut + 0.16)
      .call(wash, [], shut + 0.3);
  });

  const wash = contextSafe(() => {
    const q = gsap.utils.selector(root);
    setPhase('washing');
    onStart();
    announce(`Machine ${id} is washing.`);

    const spin = gsap.to(q('.m-spin'), { rotation: '+=360', duration: 1.5, ease: 'none', repeat: -1 });
    const shake = gsap.to(q('.m-body'), { x: 1.1, duration: 0.07, ease: 'sine.inOut', repeat: -1, yoyo: true });
    const slosh = gsap.to(q('.m-wave'), { xPercent: -50, duration: 1.1, ease: 'none', repeat: -1 });
    gsap.to(q('.m-water'), { yPercent: 42, duration: 1.4, ease: 'power2.out' });

    const top = { x: door.x, y: floor - MACHINE_H * scale };
    const suds = gsap.delayedCall(0.5, function bubble() {
      const el = emit('fx-bubble', { x: top.x + gsap.utils.random(-30, 30) * scale, y: top.y }, gsap.utils.random(8, 18));
      gsap.to(el, { y: top.y - gsap.utils.random(70, 150), x: `+=${gsap.utils.random(-26, 26)}`, duration: 1.8, ease: 'sine.out' });
      gsap.fromTo(el, { scale: 0, opacity: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
      gsap.to(el, { opacity: 0, duration: 0.4, delay: 1.4, ease: 'power2.in', onComplete: () => el.remove() });
      suds.restart(true);
    });

    const clock = { left: WASH_SECONDS };
    gsap.to(clock, {
      left: 0,
      duration: WASH_SECONDS,
      ease: 'none',
      onUpdate: () => {
        if (display.current) display.current.textContent = `0:0${Math.ceil(clock.left)}`;
      },
    });

    // Final spin: faster drum, water drains.
    gsap.to(spin, { timeScale: 3.2, duration: 1.2, ease: 'power2.in', delay: WASH_SECONDS - 2.6 });
    gsap.to(shake, { timeScale: 1.8, duration: 1.2, delay: WASH_SECONDS - 2.6 });
    gsap.to(q('.m-water'), { yPercent: 100, duration: 1.6, ease: 'power2.in', delay: WASH_SECONDS - 2.4 });

    gsap.delayedCall(WASH_SECONDS, () => {
      spin.kill();
      shake.kill();
      slosh.kill();
      suds.kill();
      finish();
    });
  });

  const finish = contextSafe(() => {
    const q = gsap.utils.selector(root);
    const top = { x: door.x, y: floor - MACHINE_H * scale };
    if (display.current) display.current.textContent = 'FRESH';
    sfx.chime();

    gsap
      .timeline({
        onComplete: () => {
          setPhase('fresh');
          announce(`Machine ${id} finished a load. Fresh towels are ready.`);
        },
      })
      .to(q('.m-body'), { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)' }, 0)
      .to(q('.m-spin'), { rotation: 0, duration: 0.4 }, 0)
      .call(() => sfx.doorOpen(), [], 0.25)
      .to(q('.m-glass'), { rotateY: -118, duration: 0.45, ease: 'back.out(1.6)' }, 0.25)
      .to(q('.m-cloth'), { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.4)
      .call(
        () => {
          // A soft puff of steam out of the open door.
          for (let i = 0; i < 4; i++) {
            const puff = emit('fx-steam', { x: door.x + (i - 1.5) * 9 * scale, y: door.y }, 34 * scale);
            gsap.fromTo(puff, { scale: 0.3, opacity: 0.75 }, { scale: 1.5, opacity: 0, y: door.y - 60 - i * 12, duration: 1 + i * 0.12, ease: 'power2.out', onComplete: () => puff.remove() });
          }
          onDone(id);
        },
        [],
        0.45,
      )
      .to(q('.m-stack'), { scale: 1, duration: 0.5, ease: 'back.out(2)' }, 0.6)
      .call(
        () => {
          sfx.sparkle();
          [[-30, -34], [28, -44], [0, -62]].forEach(([dx, dy], i) => {
            const star = emit('fx-star', { x: top.x + dx * scale, y: top.y + dy * scale }, 14);
            gsap.fromTo(star, { scale: 0, rotation: -40 }, { scale: 1, rotation: 20, duration: 0.3, delay: i * 0.08, ease: 'back.out(2)' });
            gsap.to(star, { scale: 0, duration: 0.25, delay: 0.7 + i * 0.08, ease: 'power2.in', onComplete: () => star.remove() });
          });
        },
        [],
        0.75,
      )
      .to(q('.m-glass'), { rotateY: 0, duration: 0.22, ease: 'power2.in' }, 1.5)
      .call(() => sfx.doorShut(), [], 1.66);
  });

  const label =
    phase === 'washing' ? `Machine ${id}, washing` : phase === 'fresh' ? `Machine ${id}, load done. Run it again` : `Run machine ${id}`;

  return (
    <div
      ref={root}
      className="m-slot"
      style={{ left: x, top: floor - MACHINE_H, transform: `scale(${scale})` }}
      data-phase={phase}
    >
      <button type="button" className="machine" onClick={run} aria-label={label} data-cursor="play">
        <span className="m-body">
          <span className="m-panel">
            <span className="m-display" ref={display}>
              {id}
            </span>
            <span className="m-led" />
            <span className="m-knob" />
          </span>
          <span className="m-door">
            <span className="m-drum">
              <span className="m-spin">
                {LOAD.map((name, i) => (
                  <img key={name} className={`m-cloth m-cloth-${i}`} src={`/img/${name}.webp`} alt="" width={30} height={30} />
                ))}
              </span>
              <span className="m-water">
                <svg className="m-wave" viewBox="0 0 160 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 6c10-8 20-8 40 0s30 8 40 0 20-8 40 0 30 8 40 0v6H0z" />
                </svg>
              </span>
            </span>
            <span className="m-glass" />
          </span>
          <span className="m-feet" />
        </span>
        <img className="m-stack" src="/img/towels.webp" alt="" width={52} height={58} />
      </button>
    </div>
  );
}
