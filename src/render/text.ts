import type { TextLayer } from '../model/types.ts';
import { shade } from '../model/colors.ts';
import { layoutText } from './fonts.ts';
import { deg, n } from './geometry.ts';
import { ribbonShape } from './ornaments.ts';

export const BASELINE = 36;
const HALF_H = 66;

export interface TextBox {
  w: number;
  h: number;
  /** Центр рамки в локальных координатах слоя (до масштабирования). */
  cx: number;
  cy: number;
  missing: string[];
}

/** Радиус дуги в локальных единицах: не зависит от размера букв. */
const arcRadius = (l: TextLayer): number => Math.max(60, l.radius / Math.max(l.scale, 0.05));

export function textBox(l: TextLayer): TextBox {
  const g = layoutText(l.text, l.font, l.bold);
  const W = Math.max(g.width, 40);
  if (l.form === 'line') return { w: W + 30, h: 2 * HALF_H, cx: 0, cy: 0, missing: g.missing };
  if (l.form === 'banner') {
    const half = Math.max(W / 2 + 50, 130);
    return { w: 2 * (half + 96), h: 150, cx: 0, cy: 10, missing: g.missing };
  }
  const R = arcRadius(l);
  const span = Math.min(W / R, Math.PI * 1.9);
  const drop = R * (1 - Math.cos(span / 2));
  const w = Math.max(2 * R * Math.sin(Math.min(span, Math.PI) / 2) + 90, 60);
  if (l.form === 'arcUp') return { w, h: drop + 2 * HALF_H, cx: 0, cy: (drop - 70 + BASELINE) / 2, missing: g.missing };
  return { w, h: drop + 2 * HALF_H, cx: 0, cy: (-drop - 70 + BASELINE) / 2, missing: g.missing };
}

export function renderTextBody(l: TextLayer): string {
  const g = layoutText(l.text, l.font, l.bold);
  const W = g.width;
  let out = '';
  const fill = `fill="${l.color}"`;
  if (l.form === 'banner') {
    const half = Math.max(W / 2 + 50, 130);
    out += ribbonShape(half, 118, 0, l.bannerColor, shade(l.bannerColor, -0.35));
  }
  if (l.form === 'line' || l.form === 'banner') {
    let pen = -W / 2;
    let d = '';
    for (const gl of g.glyphs) {
      if (gl.d) d += `<path transform="translate(${n(pen)} ${BASELINE})" d="${gl.d}"/>`;
      pen += gl.adv;
    }
    return out + `<g ${fill}>${d}</g>`;
  }
  const R = arcRadius(l);
  let s = -W / 2;
  let d = '';
  for (const gl of g.glyphs) {
    const mid = s + gl.adv / 2;
    const a = mid / R;
    const px = R * Math.sin(a);
    const py = l.form === 'arcUp' ? R - R * Math.cos(a) : -R + R * Math.cos(a);
    const rot = l.form === 'arcUp' ? deg(a) : -deg(a);
    if (gl.d) d += `<path transform="translate(${n(px)} ${n(py)}) rotate(${n(rot)}) translate(${n(-gl.adv / 2)} ${BASELINE})" d="${gl.d}"/>`;
    s += gl.adv;
  }
  return out + `<g ${fill}>${d}</g>`;
}
