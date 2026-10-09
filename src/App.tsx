import Lenis from 'lenis';
import { useEffect, useRef } from 'react';
import { Cursor } from './components/Cursor';
import { Header } from './components/Header';
import { Business, Footer, HowItWorks, Marquee, Press, Prices, Services, Visit } from './components/Sections';
import { gsap, ScrollTrigger, SplitText, useGSAP } from './lib/gsap-setup';
import { motion } from './lib/motion-guard';
import { ShopScene } from './scene/ShopScene';

export default function App() {
  const root = useRef<HTMLDivElement>(null);

  // Smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in step.
  useEffect(() => {
    if (motion.reduced) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: { offset: -72 } });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  useGSAP(
    () => {
      if (motion.reduced) return;

      // Content rises in once as it enters, and does not replay.
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      gsap.set(targets, { opacity: 0, y: 28 });
      ScrollTrigger.batch(targets, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, stagger: 0.055, overwrite: true }),
      });

      const split = SplitText.create('.wordmark', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, {
        yPercent: 100,
        opacity: 0,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.09,
        scrollTrigger: { trigger: '.wordmark', start: 'top bottom', once: true },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <a className="skip-link" href="#how">
        Skip the shop
      </a>
      <Header />
      <main>
        <ShopScene />
        <Marquee />
        <HowItWorks />
        <Services />
        <Press />
        <Prices />
        <Business />
        <Visit />
      </main>
      <Footer />
      <div id="live-region" className="sr-only" aria-live="polite" />
      <Cursor />
    </div>
  );
}
