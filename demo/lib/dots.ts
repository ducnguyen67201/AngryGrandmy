/**
 * Stippled-ink illustration engine.
 *
 * Every dot field is generated from parametric shape functions plus a seeded
 * mulberry32 PRNG, so the markup is *deterministic*: the module runs once at
 * import on both server and client and produces byte-identical output, which
 * means no hydration mismatch even though the art looks hand-stippled.
 *
 * Nothing here uses Math.random, Date, or any ambient state. Coordinates live
 * in a normalised viewBox (usually 0..100 or 0..120) and are rounded so the
 * serialized SVG stays compact and stable.
 */

export interface Dot {
  x: number;
  y: number;
  r: number;
  o: number;
}

export interface DotLayer {
  dots: Dot[];
  /** slow CSS rotation for orbital rings; gated behind prefers-reduced-motion in CSS */
  spin?: 'slow' | 'rev';
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function push(dots: Dot[], x: number, y: number, r: number, o: number) {
  dots.push({ x: r2(x), y: r2(y), r: r3(r), o: r2(o) });
}

/* ---------- generic parametric primitives ---------- */

interface StrokeOpts {
  minR?: number;
  maxR?: number;
  o?: number;
  jitter?: number;
  seed: number;
}

/** Scatter `count` dots along a parametric curve fn(t) for t in [0, 1). */
function strokeDots(count: number, fn: (t: number) => [number, number], opts: StrokeOpts): Dot[] {
  const { minR = 0.4, maxR = 0.7, o = 0.6, jitter = 0.4, seed } = opts;
  const rng = mulberry32(seed);
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const [x, y] = fn(i / count);
    const jx = (rng() - 0.5) * jitter;
    const jy = (rng() - 0.5) * jitter;
    const r = minR + (maxR - minR) * rng();
    push(dots, x + jx, y + jy, r, o * (0.7 + 0.3 * rng()));
  }
  return dots;
}

interface FillOpts extends StrokeOpts {
  bbox: [number, number, number, number]; // x0, y0, x1, y1
  inside: (x: number, y: number) => boolean;
}

/** Rejection-sample `count` dots inside an implicit region. */
function fillDots(count: number, opts: FillOpts): Dot[] {
  const { minR = 0.4, maxR = 0.7, o = 0.6, seed, bbox, inside } = opts;
  const [x0, y0, x1, y1] = bbox;
  const rng = mulberry32(seed);
  const dots: Dot[] = [];
  let guard = 0;
  const maxGuard = count * 60;
  while (dots.length < count && guard < maxGuard) {
    guard++;
    const x = x0 + rng() * (x1 - x0);
    const y = y0 + rng() * (y1 - y0);
    if (!inside(x, y)) continue;
    const r = minR + (maxR - minR) * rng();
    push(dots, x, y, r, o * (0.7 + 0.3 * rng()));
  }
  return dots;
}

const ellipse =
  (cx: number, cy: number, a: number, b: number, rot = 0) =>
  (t: number): [number, number] => {
    const ct = Math.cos(rot);
    const st = Math.sin(rot);
    const ex = a * Math.cos(TAU * t);
    const ey = b * Math.sin(TAU * t);
    return [cx + ex * ct - ey * st, cy + ex * st + ey * ct];
  };

const arc =
  (cx: number, cy: number, radius: number, start: number, end: number) =>
  (t: number): [number, number] => {
    const ang = start + (end - start) * t;
    return [cx + radius * Math.cos(ang), cy + radius * Math.sin(ang)];
  };

const segment =
  (x1: number, y1: number, x2: number, y2: number) =>
  (t: number): [number, number] =>
    [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];

/* ---------- shaded sphere (halftone) ---------- */

interface SphereOpts {
  count: number;
  cx?: number;
  cy?: number;
  radius?: number;
  minR?: number;
  maxR?: number;
  seed?: number;
  frontOnly?: number;
  light?: [number, number, number];
}

export function sphereDots(opts: SphereOpts): Dot[] {
  const {
    count,
    cx = 50,
    cy = 50,
    radius = 40,
    minR = 0.35,
    maxR = 1.2,
    seed = 1,
    frontOnly = -0.12,
  } = opts;
  const lv = opts.light ?? [-0.55, 0.6, 0.6];
  const lm = Math.hypot(lv[0], lv[1], lv[2]) || 1;
  const L: [number, number, number] = [lv[0] / lm, lv[1] / lm, lv[2] / lm];
  const rng = mulberry32(seed);
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const k = i + 0.5;
    const phi = Math.acos(clamp(1 - (2 * k) / count, -1, 1));
    const theta = GOLDEN_ANGLE * i;
    let nx = Math.sin(phi) * Math.cos(theta);
    let ny = Math.sin(phi) * Math.sin(theta);
    let nz = Math.cos(phi);
    // tiny organic jitter, then renormalize back onto the sphere
    nx += (rng() - 0.5) * 0.03;
    ny += (rng() - 0.5) * 0.03;
    nz += (rng() - 0.5) * 0.03;
    const inv = 1 / (Math.hypot(nx, ny, nz) || 1);
    nx *= inv;
    ny *= inv;
    nz *= inv;
    if (nz < frontOnly) continue; // drop the deep back — keeps DOM light, clean silhouette
    const lambert = nx * L[0] + ny * L[1] + nz * L[2];
    const lit = clamp(lambert, 0, 1);
    const ink = 0.16 + 0.84 * (1 - lit); // shadow side carries more ink
    const front = (nz + 1) / 2;
    const r = minR + (maxR - minR) * ink;
    const o = clamp(ink * (0.28 + 0.72 * front), 0.06, 0.92);
    push(dots, cx + nx * radius, cy - ny * radius, r, o);
  }
  return dots;
}

interface RingOpts {
  count: number;
  cx?: number;
  cy?: number;
  a: number;
  b: number;
  tilt?: number;
  seed?: number;
  thickness?: number;
  minR?: number;
  maxR?: number;
  baseO?: number;
}

export function ringDots(opts: RingOpts): Dot[] {
  const {
    count,
    cx = 50,
    cy = 50,
    a,
    b,
    tilt = 0,
    seed = 7,
    thickness = 0.05,
    minR = 0.3,
    maxR = 0.66,
    baseO = 0.5,
  } = opts;
  const rng = mulberry32(seed);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const ang = (TAU * i) / count + rng() * 0.02;
    const rr = 1 + (rng() - 0.5) * thickness;
    const ex = a * Math.cos(ang) * rr;
    const ey = b * Math.sin(ang) * rr;
    const front = (Math.sin(ang) + 1) / 2;
    const r = minR + (maxR - minR) * (0.4 + 0.6 * front);
    const o = baseO * (0.3 + 0.7 * front);
    push(dots, cx + ex * ct - ey * st, cy + ex * st + ey * ct, r, o);
  }
  return dots;
}

/* ============================================================
   HERO — "the network of spend, held in check"
   a shaded sphere with two slow orbital rings
   ============================================================ */

export const HERO_ART: DotLayer[] = [
  { dots: sphereDots({ count: 2400, cx: 60, cy: 60, radius: 38, seed: 1337 }) },
  {
    dots: ringDots({
      count: 150,
      cx: 60,
      cy: 60,
      a: 55,
      b: 19,
      tilt: -0.42,
      seed: 24,
      baseO: 0.55,
      minR: 0.32,
      maxR: 0.72,
    }),
    spin: 'slow',
  },
  {
    dots: ringDots({
      count: 128,
      cx: 60,
      cy: 60,
      a: 48,
      b: 14,
      tilt: 0.6,
      seed: 91,
      baseO: 0.4,
      minR: 0.28,
      maxR: 0.6,
    }),
    spin: 'rev',
  },
];

export const HERO_VIEWBOX = '0 0 120 120';

/* ============================================================
   LEVEL GLYPHS (viewBox 0 0 100 100) — eye / gauge / hand / orbit
   ============================================================ */

const GLYPH_R = { minR: 1.5, maxR: 2.5 };

function eyeGlyph(): DotLayer[] {
  const outline = strokeDots(74, ellipse(50, 50, 36, 20), { seed: 11, o: 0.5, ...GLYPH_R });
  const iris = strokeDots(40, ellipse(50, 50, 13, 13), { seed: 12, o: 0.62, ...GLYPH_R });
  const pupil = fillDots(46, {
    seed: 13,
    o: 0.78,
    minR: 1.5,
    maxR: 2.3,
    bbox: [42, 42, 58, 58],
    inside: (x, y) => (x - 50) ** 2 + (y - 50) ** 2 <= 6.6 ** 2,
  });
  return [{ dots: [...outline, ...iris, ...pupil] }];
}

function gaugeGlyph(): DotLayer[] {
  const cx = 50;
  const cy = 60;
  const start = 210 * DEG;
  const end = 330 * DEG;
  const dial = strokeDots(58, arc(cx, cy, 33, start, end), { seed: 21, o: 0.5, ...GLYPH_R });
  const ticks: Dot[] = [];
  [0, 0.25, 0.5, 0.75, 1].forEach((f, i) => {
    const ang = start + (end - start) * f;
    const inner = 26;
    const outer = 33;
    const tick = strokeDots(
      4,
      segment(
        cx + inner * Math.cos(ang),
        cy + inner * Math.sin(ang),
        cx + outer * Math.cos(ang),
        cy + outer * Math.sin(ang),
      ),
      { seed: 30 + i, o: 0.55, minR: 1.4, maxR: 2.1, jitter: 0.2 },
    );
    ticks.push(...tick);
  });
  const needleAng = start + (end - start) * 0.68;
  const needle = strokeDots(
    22,
    segment(cx, cy, cx + 29 * Math.cos(needleAng), cy + 29 * Math.sin(needleAng)),
    { seed: 40, o: 0.66, minR: 1.5, maxR: 2.4, jitter: 0.35 },
  );
  const hub = fillDots(12, {
    seed: 41,
    o: 0.7,
    minR: 1.6,
    maxR: 2.4,
    bbox: [46, 56, 54, 64],
    inside: (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= 3.4 ** 2,
  });
  return [{ dots: [...dial, ...ticks, ...needle, ...hub] }];
}

function handGlyph(): DotLayer[] {
  const palm = fillDots(72, {
    seed: 51,
    o: 0.58,
    minR: 1.5,
    maxR: 2.3,
    bbox: [33, 46, 67, 74],
    inside: (x, y) => ((x - 50) / 15) ** 2 + ((y - 60) / 13) ** 2 <= 1,
  });
  const fingers: Dot[] = [];
  const cols: Array<[number, number]> = [
    [41.5, 34],
    [47.5, 30],
    [53.5, 31],
    [59.5, 35],
  ];
  cols.forEach(([fx, ftop], i) => {
    fingers.push(
      ...strokeDots(9, segment(fx, 52, fx, ftop), {
        seed: 60 + i,
        o: 0.6,
        minR: 1.5,
        maxR: 2.3,
        jitter: 0.25,
      }),
    );
  });
  const thumb = strokeDots(8, segment(37, 60, 30, 51), {
    seed: 70,
    o: 0.58,
    minR: 1.5,
    maxR: 2.3,
    jitter: 0.25,
  });
  return [{ dots: [...palm, ...fingers, ...thumb] }];
}

function orbitGlyph(): DotLayer[] {
  const core = sphereDots({
    count: 240,
    cx: 50,
    cy: 50,
    radius: 16,
    minR: 1.1,
    maxR: 2.2,
    seed: 80,
    frontOnly: -0.1,
  });
  const ring = ringDots({
    count: 48,
    cx: 50,
    cy: 50,
    a: 34,
    b: 12,
    tilt: -0.4,
    seed: 81,
    baseO: 0.55,
    minR: 1.2,
    maxR: 2.1,
  });
  return [{ dots: core }, { dots: ring, spin: 'slow' }];
}

export const LEVEL_GLYPHS = {
  observe: eyeGlyph(),
  cap: gaugeGlyph(),
  approve: handGlyph(),
  autonomous: orbitGlyph(),
} satisfies Record<string, DotLayer[]>;

/* ============================================================
   TAB MARKS (viewBox 0 0 100 100) — tiny stipple emblems
   ============================================================ */

const MARK_R = { minR: 1.8, maxR: 2.7 };

function routeMark(): DotLayer[] {
  const path = strokeDots(
    26,
    (t) => [20 + 60 * t, 68 - 26 * t - 16 * Math.sin(Math.PI * t)],
    { seed: 101, o: 0.55, ...MARK_R, jitter: 0.6 },
  );
  const ends = [
    ...fillDots(8, {
      seed: 102,
      o: 0.72,
      minR: 1.8,
      maxR: 2.6,
      bbox: [14, 62, 26, 74],
      inside: (x, y) => (x - 20) ** 2 + (y - 68) ** 2 <= 4 ** 2,
    }),
    ...fillDots(8, {
      seed: 103,
      o: 0.72,
      minR: 1.8,
      maxR: 2.6,
      bbox: [74, 36, 86, 48],
      inside: (x, y) => (x - 80) ** 2 + (y - 42) ** 2 <= 4 ** 2,
    }),
  ];
  return [{ dots: [...path, ...ends] }];
}

function stackMark(): DotLayer[] {
  const rows: Dot[] = [];
  [34, 50, 66].forEach((y, i) => {
    rows.push(
      ...strokeDots(13, segment(28, y, 72, y), {
        seed: 110 + i,
        o: 0.56,
        ...MARK_R,
        jitter: 0.35,
      }),
    );
  });
  return [{ dots: rows }];
}

function returnMark(): DotLayer[] {
  const uturn = strokeDots(30, arc(50, 50, 25, -60 * DEG, 200 * DEG), {
    seed: 120,
    o: 0.55,
    ...MARK_R,
    jitter: 0.5,
  });
  const head = fillDots(9, {
    seed: 121,
    o: 0.72,
    minR: 1.8,
    maxR: 2.6,
    bbox: [56, 24, 74, 42],
    inside: (x, y) => (x - 63) ** 2 + (y - 33) ** 2 <= 5 ** 2,
  });
  return [{ dots: [...uturn, ...head] }];
}

function nodeMark(): DotLayer[] {
  const edges: Array<[number, number, number, number]> = [
    [50, 24, 76, 50],
    [76, 50, 50, 76],
    [50, 76, 24, 50],
    [24, 50, 50, 24],
  ];
  const outline: Dot[] = [];
  edges.forEach((e, i) => {
    outline.push(
      ...strokeDots(9, segment(e[0], e[1], e[2], e[3]), {
        seed: 130 + i,
        o: 0.55,
        ...MARK_R,
        jitter: 0.3,
      }),
    );
  });
  const center = fillDots(8, {
    seed: 140,
    o: 0.72,
    minR: 1.8,
    maxR: 2.6,
    bbox: [44, 44, 56, 56],
    inside: (x, y) => (x - 50) ** 2 + (y - 50) ** 2 <= 4 ** 2,
  });
  return [{ dots: [...outline, ...center] }];
}

export const TAB_MARKS: Record<string, DotLayer[]> = {
  route: routeMark(),
  stack: stackMark(),
  return: returnMark(),
  node: nodeMark(),
};
