import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '../lib/gsap-setup';
import { motion } from '../lib/motion-guard';
import { sfx } from '../lib/sound';

/** A looping walk-cycle strip, as printed by scripts/walk-sheet.mjs. */
export type WalkSheet = {
  src: string;
  frames: number;
  /** Cell width over height. */
  aspect: number;
  /** Ground covered per full cycle (two steps), as a fraction of the character's height. */
  stride: number;
  /** Length of one cycle at the character's natural pace. */
  cycleSeconds: number;
  /** Feet-together frames to settle on when standing still. */
  rest: [number, number];
};

type Props = {
  name: string;
  sheet: WalkSheet;
  /** Height, floor line and roaming range in board units. */
  height: number;
  floor: number;
  range: [number, number];
  start: number;
  /** 1 is the pace the walk was recorded at. */
  pace?: number;
  pause?: [number, number];
  lines: string[];
  className?: string;
};

/** A character that wanders its stretch of floor and says something when tapped. */
export function Walker({ name, sheet, height, floor, range, start, pace = 0.8, pause = [1.6, 4.4], lines, className = '' }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<string | null>(null);
  const nextLine = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);

  const width = Math.round(height * sheet.aspect);
  // The legs are driven by distance travelled, not by a clock, so the feet never slide.
  const cycleLength = sheet.stride * height;
  const speed = (cycleLength / sheet.cycleSeconds) * pace;

  const { contextSafe } = useGSAP(
    () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const strip = q('.walker-strip');
      // Where we are in the cycle, 0 to 1.
      let phase = sheet.rest[0] / sheet.frames;
      const show = () => gsap.set(strip, { xPercent: (-100 / sheet.frames) * (Math.floor(phase * sheet.frames) % sheet.frames) });

      gsap.set(el, { x: start });
      show();
      if (motion.reduced) return;

      const settle = () => {
        // Finish the step in progress: carry on to the next feet-together pose.
        const here = phase % 1;
        const rests = sheet.rest.map((frame) => frame / sheet.frames);
        const next = rests.find((r) => r >= here) ?? rests[0] + 1;
        const state = { phase: here };
        gsap.to(state, {
          phase: next,
          duration: Math.max(0.12, (next - here) * sheet.cycleSeconds),
          ease: 'power1.out',
          onUpdate: () => {
            phase = state.phase;
            show();
          },
        });
      };

      const wander = () => {
        const here = gsap.getProperty(el, 'x') as number;
        let target = gsap.utils.random(range[0], range[1]);
        if (Math.abs(target - here) < 180) target = here < (range[0] + range[1]) / 2 ? range[1] - Math.random() * 120 : range[0] + Math.random() * 120;
        const distance = Math.abs(target - here);
        const facing = target > here ? 1 : -1;

        // Ease in and out of a steady pace: short ramps, constant speed between them.
        const ramp = Math.min(0.3, (0.45 * speed) / distance);
        const cruise = 1 / (1 - ramp);
        const ease = (p: number) => {
          if (p < ramp) return (cruise * p * p) / (2 * ramp);
          if (p > 1 - ramp) return 1 - (cruise * (1 - p) * (1 - p)) / (2 * ramp);
          return cruise * (p - ramp / 2);
        };

        let last = here;
        gsap
          .timeline({ onComplete: () => void gsap.delayedCall(gsap.utils.random(pause[0], pause[1]), wander) })
          // Turn round like a body, not a mirror flip.
          .to(q('.walker-flip'), { scaleX: facing, duration: 0.32, ease: 'power2.inOut' })
          .to(el, {
            x: target,
            duration: (distance / speed) * cruise,
            ease,
            onUpdate: () => {
              const x = gsap.getProperty(el, 'x') as number;
              phase += Math.abs(x - last) / cycleLength;
              last = x;
              show();
            },
          })
          .call(settle);
      };
      gsap.delayedCall(gsap.utils.random(0.4, 2.5), wander);
    },
    { scope: root },
  );

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const greet = contextSafe(() => {
    setLine(lines[nextLine.current % lines.length]);
    nextLine.current += 1;
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setLine(null), 2800);
    sfx.hop();
    if (motion.reduced) return;
    gsap
      .timeline()
      .to('.walker-hop', { y: -20, duration: 0.2, ease: 'power2.out' })
      .to('.walker-hop', { y: 0, duration: 0.5, ease: 'bounce.out' });
  });

  return (
    <div ref={root} className={`walker ${className}`} style={{ top: floor - height, width, height }}>
      <div className="walker-hop">
        <div className="walker-flip">
          <div className="walker-frame">
            <img className="walker-strip" src={sheet.src} alt="" style={{ width: width * sheet.frames, height }} draggable={false} />
          </div>
        </div>
      </div>
      <button type="button" className="walker-hit" onClick={greet} aria-label={`Say hello to ${name}`} data-cursor="hi" />
      <div className={`speech ${line ? 'is-open' : ''}`} role="status">
        {line}
      </div>
    </div>
  );
}
