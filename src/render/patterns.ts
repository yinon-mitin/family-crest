import type { PatternId } from '../model/types.ts';
import { circle, n, poly } from './geometry.ts';

export interface PatternDef {
  name: string;
  /** Контур узора. Если задан `stroke`, рисуется линией такой толщины, иначе заливкой. */
  build(): { d: string; stroke?: number };
}

const R = 440; // узор покрывает квадрат со стороной 2R вокруг центра щита

function stripes() {
  let d = '';
  for (let x = -R; x < R; x += 80) d += `M${x},${-R}h40v${2 * R}h-40z`;
  return { d };
}

function chevrons() {
  let d = '';
  for (let y = -R - 60; y < R; y += 84) {
    const top: [number, number][] = [];
    const bottom: [number, number][] = [];
    for (let x = -R, i = 0; x <= R; x += 70, i++) {
      const dy = i % 2 === 0 ? 0 : -36;
      top.push([x, y + dy]);
      bottom.push([x, y + dy + 26]);
    }
    d += poly([...top, ...bottom.reverse()]);
  }
  return { d };
}

function checks() {
  let d = '';
  const s = 60;
  for (let i = 0, y = -R; y < R; y += s, i++) {
    for (let j = 0, x = -R; x < R; x += s, j++) if ((i + j) % 2 === 0) d += `M${x},${y}h${s}v${s}h${-s}z`;
  }
  return { d };
}

function lozenges() {
  let d = '';
  for (let i = 0, y = -R; y < R + 60; y += 54, i++) {
    for (let x = -R + (i % 2 ? 30 : 0); x < R + 60; x += 60) d += poly([[x, y - 26], [x + 18, y], [x, y + 26], [x - 18, y]]);
  }
  return { d };
}

function scales() {
  let d = '';
  for (let i = 0, y = -R; y < R + 60; y += 34, i++) {
    for (let x = -R + (i % 2 ? 36 : 0); x < R + 72; x += 72) d += `M${x - 36},${y}a36,36 0 0 0 72,0`;
  }
  return { d, stroke: 5 };
}

function waves() {
  let d = '';
  for (let y = -R; y < R + 40; y += 52) {
    d += `M${-R},${y}`;
    for (let x = -R; x < R; x += 80) d += `q20,-28 40,0t40,0`;
  }
  return { d, stroke: 9 };
}

function dots() {
  let d = '';
  for (let i = 0, y = -R; y < R + 40; y += 48, i++) {
    for (let x = -R + (i % 2 ? 28 : 0); x < R + 40; x += 56) d += circle(x, y, 10);
  }
  return { d };
}

function ermine() {
  let d = '';
  const tail = (x: number, y: number) =>
    `M${n(x)},${n(y - 24)}C${n(x + 12)},${n(y - 10)} ${n(x + 9)},${n(y + 6)} ${n(x)},${n(y + 16)}` +
    `C${n(x - 9)},${n(y + 6)} ${n(x - 12)},${n(y - 10)} ${n(x)},${n(y - 24)}z` +
    circle(x - 14, y + 26, 4) + circle(x, y + 30, 4) + circle(x + 14, y + 26, 4);
  for (let i = 0, y = -R; y < R + 80; y += 80, i++) {
    for (let x = -R + (i % 2 ? 40 : 0); x < R + 80; x += 80) d += tail(x, y);
  }
  return { d };
}

export const PATTERNS: Record<PatternId, PatternDef> = {
  stripes: { name: 'Полосы', build: stripes },
  chevrons: { name: 'Шевроны', build: chevrons },
  checks: { name: 'Шахматка', build: checks },
  lozenges: { name: 'Ромбы', build: lozenges },
  scales: { name: 'Чешуя', build: scales },
  waves: { name: 'Волны', build: waves },
  dots: { name: 'Горошек', build: dots },
  ermine: { name: 'Горностай', build: ermine },
};

const cache = new Map<PatternId, { d: string; stroke?: number }>();
export function patternGeometry(id: PatternId): { d: string; stroke?: number } {
  let g = cache.get(id);
  if (!g) {
    g = PATTERNS[id].build();
    cache.set(id, g);
  }
  return g;
}
