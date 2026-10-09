// Sound layer: recorded samples for the signature moments, tiny synthesised cues
// for the rest, a quiet ambience bed. Nothing plays before the first user gesture.
import { useSyncExternalStore } from 'react';

type Sample = 'washer' | 'ambience' | 'bell' | 'chime' | 'door';

// Samples are loudness-normalised on disk; these keep them low under the master.
const SAMPLE_GAIN: Record<Sample, number> = {
  washer: 0.5,
  ambience: 0.42,
  bell: 0.3,
  chime: 0.3,
  door: 0.5,
};

const MUTE_KEY = 'lc-muted';
const MASTER = 0.8;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* private mode */
}

const buffers = new Map<Sample, AudioBuffer>();
const lastPlayed = new Map<string, number>();
const listeners = new Set<() => void>();

type Loop = { gain: GainNode; source: AudioBufferSourceNode };
let ambience: Loop | null = null;
let washer: Loop | null = null;
let washersRunning = 0;
let ambienceLevel = 1;

function gate(key: string, ms: number) {
  const now = performance.now();
  if (now - (lastPlayed.get(key) ?? -1e9) < ms) return false;
  lastPlayed.set(key, now);
  return true;
}

function ready() {
  return ctx !== null && master !== null && !muted && ctx.state === 'running';
}

async function load(name: Sample) {
  if (!ctx || buffers.has(name)) return;
  try {
    const data = await (await fetch(`/audio/${name}.mp3`)).arrayBuffer();
    buffers.set(name, await ctx.decodeAudioData(data));
  } catch {
    /* a missing sample just stays silent */
  }
}

function startLoop(name: Sample, level: number): Loop | null {
  const buffer = buffers.get(name);
  if (!ctx || !master || !buffer) return null;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  // MP3 padding leaves a sliver of silence at each end; loop inside it.
  source.loopStart = 0.06;
  source.loopEnd = buffer.duration - 0.06;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(SAMPLE_GAIN[name] * level, ctx.currentTime + 1.2);
  source.connect(gain).connect(master);
  source.start(0, 0.06);
  return { gain, source };
}

function stopLoop(loop: Loop | null, fade = 0.6) {
  if (!ctx || !loop) return;
  const t = ctx.currentTime;
  loop.gain.gain.cancelScheduledValues(t);
  loop.gain.gain.setTargetAtTime(0, t, fade / 4);
  loop.source.stop(t + fade + 0.2);
}

function syncAmbience() {
  if (!ctx) return;
  if (!ambience) ambience = startLoop('ambience', ambienceLevel);
  else ambience.gain.gain.setTargetAtTime(SAMPLE_GAIN.ambience * ambienceLevel, ctx.currentTime, 0.4);
}

function syncWasher() {
  if (!ctx) return;
  if (washersRunning > 0) {
    // Several machines share one loop that gets a little fuller, never stacked copies.
    const level = Math.min(1.4, 1 + (washersRunning - 1) * 0.12);
    if (!washer) washer = startLoop('washer', level);
    else washer.gain.gain.setTargetAtTime(SAMPLE_GAIN.washer * level, ctx.currentTime, 0.3);
  } else if (washer) {
    stopLoop(washer, 1);
    washer = null;
  }
}

/** Call from the first pointer or key gesture. Safe to call repeatedly. */
export function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
    return;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER;
  master.connect(ctx.destination);
  void ctx.resume();
  void Promise.all((['ambience', 'bell', 'door', 'chime', 'washer'] as Sample[]).map(load)).then(() => {
    syncAmbience();
    syncWasher();
    playSample('bell', 20000);
  });
}

function playSample(name: Sample, gateMs = 120) {
  const buffer = buffers.get(name);
  if (!ready() || !buffer || !gate(name, gateMs)) return;
  const source = ctx!.createBufferSource();
  source.buffer = buffer;
  source.detune.value = (Math.random() - 0.5) * 60;
  const gain = ctx!.createGain();
  gain.gain.value = SAMPLE_GAIN[name];
  source.connect(gain).connect(master!);
  source.start();
}

type ToneOptions = {
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  gain: number;
  delay?: number;
  pan?: [number, number];
};

function tone({ type = 'sine', from, to = from, dur, gain, delay = 0, pan }: ToneOptions) {
  if (!ready()) return;
  const t = ctx!.currentTime + delay;
  const osc = ctx!.createOscillator();
  osc.type = type;
  osc.detune.value = (Math.random() - 0.5) * 30;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.012, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out: AudioNode = osc.connect(g);
  if (pan) {
    const p = ctx!.createStereoPanner();
    p.pan.setValueAtTime(pan[0], t);
    p.pan.linearRampToValueAtTime(pan[1], t + dur);
    out = out.connect(p);
  }
  out.connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

type NoiseOptions = {
  dur: number;
  gain: number;
  filter?: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
  delay?: number;
};

let noiseBuffer: AudioBuffer | null = null;

function noise({ dur, gain, filter = 'bandpass', from, to = from, q = 1, delay = 0 }: NoiseOptions) {
  if (!ready()) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx!.createBuffer(1, ctx!.sampleRate, ctx!.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = ctx!.currentTime + delay;
  const source = ctx!.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  const f = ctx!.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.03, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  source.connect(f).connect(g).connect(master!);
  source.start(t, Math.random() * 0.5);
  source.stop(t + dur + 0.05);
}

/** Named cues. Each one is rate-limited so repeats never stack. */
export const sfx = {
  beep: () => gate('beep', 120) && tone({ from: 1320, dur: 0.07, gain: 0.1 }),
  doorOpen() {
    if (!gate('doorOpen', 120)) return;
    tone({ from: 170, to: 70, dur: 0.1, gain: 0.22 });
    noise({ dur: 0.04, gain: 0.08, filter: 'highpass', from: 1800 });
  },
  doorShut: () => playSample('door', 200),
  chime: () => playSample('chime', 1500),
  whoosh: () => gate('whoosh', 140) && noise({ dur: 0.26, gain: 0.07, from: 500, to: 1900, q: 1.4 }),
  drop: () => gate('drop', 140) && tone({ from: 180, to: 70, dur: 0.12, gain: 0.16 }),
  pop() {
    if (!gate('pop', 120)) return;
    tone({ from: 520, to: 1350, dur: 0.05, gain: 0.16 });
    noise({ dur: 0.03, gain: 0.07, filter: 'highpass', from: 2500 });
  },
  hop: () => gate('hop', 300) && tone({ type: 'triangle', from: 420, to: 880, dur: 0.09, gain: 0.13 }),
  sparkle() {
    if (!gate('sparkle', 400)) return;
    tone({ from: 1568, dur: 0.22, gain: 0.07 });
    tone({ from: 2093, dur: 0.3, gain: 0.06, delay: 0.09 });
  },
  buzz() {
    if (!gate('buzz', 900)) return;
    tone({ type: 'sawtooth', from: 100, dur: 0.12, gain: 0.04 });
    tone({ type: 'sawtooth', from: 100, dur: 0.3, gain: 0.05, delay: 0.18 });
  },
  horn() {
    if (!gate('horn', 1500)) return;
    tone({ type: 'square', from: 494, dur: 0.11, gain: 0.05 });
    tone({ type: 'square', from: 494, dur: 0.16, gain: 0.05, delay: 0.17 });
  },
  /** A scooter going by, panned across. Long cue: at most once per 20s. */
  putter(leftToRight: boolean) {
    if (!gate('putter', 20000) || !ready()) return;
    const pan: [number, number] = leftToRight ? [-0.9, 0.9] : [0.9, -0.9];
    for (let i = 0; i < 26; i++) {
      const swell = Math.sin((i / 25) * Math.PI);
      tone({ type: 'sawtooth', from: 92, to: 80, dur: 0.11, gain: 0.012 + 0.03 * swell, delay: i * 0.13, pan: [pan[0] + ((pan[1] - pan[0]) * i) / 25, pan[0] + ((pan[1] - pan[0]) * (i + 1)) / 25] });
    }
  },
  purr() {
    if (!gate('purr', 2500)) return;
    for (let i = 0; i < 18; i++) tone({ type: 'triangle', from: 82, to: 74, dur: 0.045, gain: 0.07, delay: i * 0.05 });
  },
  steam: () => gate('steam', 300) && noise({ dur: 0.7, gain: 0.07, filter: 'highpass', from: 3200, to: 5200 }),
  flip: () => gate('flip', 200) && noise({ dur: 0.18, gain: 0.05, from: 900, to: 2400, q: 1.2 }),
  toggle: () => gate('toggle', 150) && tone({ type: 'triangle', from: 660, to: 990, dur: 0.08, gain: 0.1 }),
  popper() {
    if (!gate('popper', 2500)) return;
    tone({ type: 'triangle', from: 520, to: 90, dur: 0.16, gain: 0.2 });
    noise({ dur: 0.05, gain: 0.14, filter: 'highpass', from: 2000 });
    noise({ dur: 0.4, gain: 0.05, filter: 'highpass', from: 4000, delay: 0.05 });
  },
};

/** How many machines are mid-wash; drives the shared washer loop. */
export function setWashers(count: number) {
  washersRunning = Math.max(0, count);
  if (ctx && buffers.has('washer')) syncWasher();
}

/** 1 while the shop is on screen, lower once the visitor has scrolled on. */
export function setAmbienceLevel(level: number) {
  ambienceLevel = level;
  if (ambience) syncAmbience();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* private mode */
  }
  if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.05);
  listeners.forEach((fn) => fn());
  if (!muted) sfx.toggle();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useMuted() {
  return useSyncExternalStore(subscribe, isMuted);
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend();
  else void ctx.resume();
});

for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, unlock, { passive: true });
}
