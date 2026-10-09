// The only place gsap is imported from 'gsap': registers plugins and sets the house defaults.
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
gsap.defaults({ ease: 'power3.out', duration: 0.8 });
ScrollTrigger.config({ ignoreMobileResize: true });
document.fonts?.ready.then(() => ScrollTrigger.refresh());

export { gsap, ScrollTrigger, SplitText, useGSAP };
