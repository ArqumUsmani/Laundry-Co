import { useRef, useState } from 'react';
import { gsap, useGSAP } from '../lib/gsap-setup';
import { motion } from '../lib/motion-guard';
import { site } from '../lib/site';
import { sfx } from '../lib/sound';
import { IronPlay } from './IronPlay';
import { Mark } from './Mark';

const MARQUEE = ['Fresh clothes, fresh life', 'Open 24/7', 'Dry cleaning', 'Steam ironing', 'Household laundry', 'Self service', 'Pickup & delivery'];

export function Marquee() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined}>
      {MARQUEE.map((item) => (
        <li key={item}>
          {item}
          <i />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee">
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

const STEPS = [
  { img: 'scooter', w: 200, h: 193, title: 'Pick up your clothes', text: 'We collect them at your convenience. No trip, no queue.' },
  { img: 'basket', w: 190, h: 200, title: 'Laundry & dry clean', text: 'Expert cleaning with premium detergents and methods.' },
  { img: 'towels', w: 180, h: 201, title: 'Fold & deliver', text: 'Folded neatly and brought back to your door.' },
];

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <header className="section-head" data-reveal>
        <p className="kicker">How it works</p>
        <h2>Three steps. Zero chores.</h2>
      </header>
      <ol className="steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="step card" data-reveal>
            <span className="step-no">{i + 1}</span>
            <img className="bob" style={{ animationDelay: `${i * -1.4}s` }} src={`/img/${step.img}.webp`} alt="" width={step.w} height={step.h} loading="lazy" decoding="async" />
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

type Service = {
  img: string;
  w: number;
  h: number;
  title: string;
  text: string;
  rows: [string, string][];
  note?: string;
};

const SERVICES: Service[] = [
  {
    img: 'suit',
    w: 110,
    h: 229,
    title: 'Dry Cleaning',
    text: 'Delicate care for suits, dresses and fabrics that need special treatment.',
    rows: [['Suits & blazers', ''], ['Sherwanis & waistcoats', ''], ['Sarees, gowns & abayas', '']],
    note: 'Rates on the price list or at the counter.',
  },
  {
    img: 'iron',
    w: 190,
    h: 123,
    title: 'Steam Ironing',
    text: 'Professional pressing for a crisp, ready-to-wear finish.',
    rows: [['Dress shirt', 'Rs 170'], ['Kurti', 'Rs 320'], ['Kameez + shalwar', 'Rs 420']],
    note: 'Iron only, per item.',
  },
  {
    img: 'towels',
    w: 160,
    h: 179,
    title: 'Household Laundry',
    text: 'Bed sheets, pillow covers, towels, comforters and more.',
    rows: [['Towel, large', 'Rs 140'], ['Bedsheet, double', 'Rs 240'], ['Comforter, double', 'Rs 1,460']],
    note: 'Wash only, per item.',
  },
  {
    img: 'basket',
    w: 170,
    h: 179,
    title: 'Self Service',
    text: 'Washer and dryer loads, run for you by our staff.',
    rows: [['Half load wash, 4–6 kg', 'Rs 1,560'], ['Full load wash, 14–21 kg', 'Rs 2,400'], ['Full load dryer, to 15 kg', 'Rs 2,400']],
    note: 'Detergent add-ons from Rs 120.',
  },
];

function ServiceCard({ service }: { service: Service }) {
  const root = useRef<HTMLButtonElement>(null);
  const [flipped, setFlipped] = useState(false);

  const { contextSafe } = useGSAP({ scope: root });

  const flip = contextSafe(() => {
    const next = !flipped;
    setFlipped(next);
    sfx.flip();
    if (motion.reduced) {
      gsap.set('.flip-inner', { rotateY: next ? 180 : 0 });
      return;
    }
    gsap.to('.flip-inner', { rotateY: next ? 180 : 0, duration: 0.9, ease: 'back.out(1.5)', overwrite: true });
  });

  return (
    <button ref={root} type="button" className="flip" onClick={flip} aria-pressed={flipped} data-reveal data-cursor="play">
      <span className="flip-inner">
        <span className="flip-face flip-front card" aria-hidden={flipped}>
          <span className="flip-art">
            <img className="bob" src={`/img/${service.img}.webp`} alt="" width={service.w} height={service.h} loading="lazy" decoding="async" />
          </span>
          <span className="flip-title">{service.title}</span>
          <span className="flip-text">{service.text}</span>
          <span className="flip-cue">
            Tap to flip <i>↻</i>
          </span>
        </span>
        <span className="flip-face flip-back card" aria-hidden={!flipped}>
          <span className="flip-title">{service.title}</span>
          <span className="flip-rows">
            {service.rows.map(([label, price]) => (
              <span key={label} className="flip-row">
                <span>{label}</span>
                {price && <b>{price}</b>}
              </span>
            ))}
          </span>
          {service.note && <span className="flip-note">{service.note}</span>}
          <span className="flip-cue">
            Flip back <i>↻</i>
          </span>
        </span>
      </span>
    </button>
  );
}

export function Services() {
  return (
    <section className="section" id="services">
      <header className="section-head" data-reveal>
        <p className="kicker">Services</p>
        <h2>Whatever it is, we'll get it fresh.</h2>
        <p className="lede">Tap a card to turn it over.</p>
      </header>
      <div className="services">
        {SERVICES.map((service) => (
          <ServiceCard key={service.title} service={service} />
        ))}
      </div>
    </section>
  );
}

export function Press() {
  return (
    <section className="section frame press" id="press">
      <div className="press-copy" data-reveal>
        <p className="kicker">Steam ironing</p>
        <h2>Wrinkles don't stand a chance.</h2>
        <p className="lede">Go on, press it. Every piece leaves the shop with the same crisp finish.</p>
        <ul className="ticks">
          <li>100% satisfaction guarantee</li>
          <li>Eco-friendly detergents and cleaning practices</li>
          <li>Quick pickup and doorstep delivery</li>
        </ul>
      </div>
      <div className="press-play" data-reveal>
        <IronPlay />
      </div>
    </section>
  );
}

const TAGS: [string, string, string][] = [
  ['T-Shirt', 'Wash', 'Rs 170'],
  ['Jeans', 'Wash', 'Rs 180'],
  ['Dress Shirt', 'Wash + iron', 'Rs 290'],
  ['Kurti', 'Wash', 'Rs 300'],
  ['Kameez + Shalwar', "Men's, wash + iron", 'Rs 560'],
  ['Bedsheet, double', 'Wash', 'Rs 240'],
  ['Towel, large', 'Wash', 'Rs 140'],
  ['Half load', 'Self service, 4–6 kg', 'Rs 1,560'],
];

export function Prices() {
  return (
    <section className="section" id="prices">
      <header className="section-head" data-reveal>
        <p className="kicker">Prices</p>
        <h2>A peek at the price list.</h2>
      </header>
      <ul className="line">
        {TAGS.map(([item, kind, price], i) => (
          <li key={item} data-reveal>
            <span className="tag" style={{ animationDelay: `${i * -0.7}s` }}>
              <i className="peg" />
              <b>{price}</b>
              <span>{item}</span>
              <small>{kind}</small>
            </span>
          </li>
        ))}
      </ul>
      <div className="line-foot" data-reveal>
        <p>Prices are per item in Pakistani Rupees. Please confirm at the counter.</p>
        <a className="btn btn-solid" href={site.rates} target="_blank" rel="noreferrer">
          <span>See the full price list</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </section>
  );
}

const CLIENTS = ['Salons & Spas', 'Restaurants', 'Organizations', 'Daycare Centers', 'Nursing Homes', 'Hotels', 'Nail Salons', 'Gyms'];

export function Business() {
  return (
    <section className="section business" id="business">
      <header className="section-head" data-reveal>
        <p className="kicker">For business</p>
        <h2>We wash for whole teams too.</h2>
        <p className="lede">Affordable packages for residential and commercial clients.</p>
      </header>
      <ul className="chips">
        {CLIENTS.map((client) => (
          <li key={client} data-reveal>
            {client}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Visit() {
  return (
    <section className="section frame visit" id="visit">
      <div className="visit-sign" data-reveal aria-hidden="true">
        <span>
          <small>Laundromat</small>
          <b>24/7</b>
        </span>
      </div>
      <div className="visit-copy" data-reveal>
        <p className="kicker">Visit or call anytime</p>
        <h2>The lights are always on.</h2>
        <address>{site.address}</address>
        <div className="visit-actions">
          <a className="btn btn-accent" href={site.whatsapp} target="_blank" rel="noreferrer">
            <span>WhatsApp us</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <a className="btn btn-ghost" href={site.phoneHref}>
            <span>{site.phoneDisplay}</span>
          </a>
          <a className="btn btn-ghost" href={site.maps} target="_blank" rel="noreferrer">
            <span>Get directions</span>
          </a>
        </div>
        <a className="visit-mail" href={`mailto:${site.email}`}>
          {site.email}
        </a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <p className="wordmark" aria-label={site.name}>
        The Laundry &amp; Co
      </p>
      <div className="footer-row">
        <span className="footer-brand">
          <Mark />
          {site.strap}
        </span>
        <span>© {new Date().getFullYear()} {site.name}. All rights reserved.</span>
      </div>
    </footer>
  );
}
