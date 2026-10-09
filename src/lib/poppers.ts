// Party poppers: plain DOM pieces, no canvas. Gone in about 2.5s, removed after.
import { gsap } from './gsap-setup';
import { motion } from './motion-guard';
import { sfx } from './sound';

const COLOURS = ['#00a8dc', '#4cc4ea', '#b9e9f8', '#ffffff', '#063a5a', '#ffbc7d'];
const SHAPES = ['rect', 'dot', 'strip'] as const;
const PER_SIDE = 46;

export function firePoppers() {
  if (motion.reduced) return;
  const layer = document.createElement('div');
  layer.className = 'poppers';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const tl = gsap.timeline({ onComplete: () => layer.remove() });

  ([-1, 1] as const).forEach((side) => {
    const popper = document.createElement('span');
    popper.className = 'popper';
    popper.textContent = '🎉';
    popper.style.left = side < 0 ? '18px' : 'auto';
    popper.style.right = side > 0 ? '18px' : 'auto';
    layer.appendChild(popper);
    gsap.set(popper, { scaleX: side < 0 ? 1 : -1, y: 90 });
    tl.to(popper, { y: 0, duration: 0.35, ease: 'back.out(2)' }, 0)
      .to(popper, { scaleY: 0.8, duration: 0.08, ease: 'power2.in' }, 0.38)
      .to(popper, { scaleY: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }, 0.46)
      .to(popper, { y: 90, duration: 0.3, ease: 'power2.in' }, 1.5);

    for (let i = 0; i < PER_SIDE; i++) {
      const piece = document.createElement('i');
      piece.className = `confetti confetti-${SHAPES[i % 3]}`;
      piece.style.background = COLOURS[i % COLOURS.length];
      piece.style.left = side < 0 ? '40px' : `${w - 40}px`;
      layer.appendChild(piece);

      const angle = gsap.utils.random(20, 78) * (Math.PI / 180);
      const power = gsap.utils.random(0.45, 1) * Math.min(h * 0.95, 820);
      const dx = Math.cos(angle) * power * 0.8 * -side;
      const dy = -Math.sin(angle) * power;
      const start = 0.46 + Math.random() * 0.08;
      tl.fromTo(
        piece,
        { x: 0, y: 0, opacity: 1, rotation: 0, rotationX: 0 },
        { x: dx, y: dy, duration: 0.7, ease: 'power3.out' },
        start,
      )
        .to(piece, { x: dx + gsap.utils.random(-70, 70), duration: 1.3, ease: 'sine.inOut' }, start + 0.7)
        .to(piece, { y: dy + gsap.utils.random(260, 520), duration: 1.3, ease: 'power1.in' }, start + 0.7)
        .to(piece, { rotation: gsap.utils.random(-540, 540), rotationX: gsap.utils.random(360, 1080), duration: 2, ease: 'power1.out' }, start)
        .to(piece, { opacity: 0, duration: 0.35, ease: 'power2.in' }, start + 1.65);
    }
  });

  tl.call(() => sfx.popper(), [], 0.44);
}
