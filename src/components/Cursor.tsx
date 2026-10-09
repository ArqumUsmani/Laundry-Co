import { useEffect, useRef } from 'react';
import { gsap } from '../lib/gsap-setup';
import { motion } from '../lib/motion-guard';

/** Pointer devices only: a ring a bit larger than the system cursor with a droplet inside. */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el || !motion.hasHover || motion.reduced) return;

    document.body.classList.add('has-cursor');
    gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0 });
    const x = gsap.quickTo(el, 'x', { duration: 0.22, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.22, ease: 'power3.out' });
    const scaleX = gsap.quickTo(el, 'scaleX', { duration: 0.35, ease: 'back.out(2)' });
    const scaleY = gsap.quickTo(el, 'scaleY', { duration: 0.35, ease: 'back.out(2)' });

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      gsap.set(el, { opacity: 1 });
      x(e.clientX);
      y(e.clientY);
      const active = (e.target as Element | null)?.closest?.('a, button, [data-cursor]');
      const size = active ? 1.45 : 1;
      scaleX(size);
      scaleY(size);
      el.classList.toggle('is-active', Boolean(active));
    };
    // Dip and spring back through the same quickTo tweens. A separate tween with
    // overwrite would kill the x/y followers and leave the ring stuck in place.
    const press = () => {
      const size = el.classList.contains('is-active') ? 1.45 : 1;
      gsap.set(el, { scaleX: size * 0.7, scaleY: size * 0.7 });
      scaleX(size);
      scaleY(size);
    };
    const leave = () => gsap.set(el, { opacity: 0 });

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', press, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', press);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.body.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div ref={ring} className="cursor" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 3.5c3 3.9 5 6.600 5 9.300a5 5 0 01-10 0c0-2.700 2-5.400 5-9.300z" />
      </svg>
    </div>
  );
}
