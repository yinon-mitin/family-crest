// Геометрия для проверок шаблонов: контур в ломаные, попадание точки в фигуру, расстояние до края.
import type { CrestDoc, Layer, ShieldLayer } from '../src/model/types.ts';
import { resolveSymbol, shieldToWorld } from '../src/model/doc.ts';
import { getSymbolPath } from '../src/data/symbols.ts';
import { ORNAMENTS } from '../src/render/ornaments.ts';
import { SHAPES } from '../src/render/shields.ts';
import { renderTextBody, textBox } from '../src/render/text.ts';
import { distToEdge, flatten, inside } from '../src/render/pathgeom.ts';
import type { Poly, Pt } from '../src/render/pathgeom.ts';

export { distToEdge, flatten, inside };
export type { Poly, Pt };

/** Аффинное преобразование как у SVG: translate · rotate · scale, затем (необязательно) сдвиг внутри. */
export function transform(polys: Poly[], tx: number, ty: number, rotDeg: number, sx: number, sy: number, pre: Pt = [0, 0]): Poly[] {
  const a = (rotDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return polys.map((p) =>
    p.map(([px, py]) => {
      const u = (px + pre[0]) * sx;
      const v = (py + pre[1]) * sy;
      return [tx + u * c - v * s, ty + u * s + v * c] as Pt;
    }),
  );
}

export function bbox(polys: Poly[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of polys)
    for (const [x, y] of p) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return { x0, y0, x1, y1 };
}

// ---------- слои документа в координатах холста ----------

export function shieldPolys(sh: ShieldLayer): Poly[] {
  return transform(flatten(SHAPES[sh.shape].d), sh.x, sh.y, sh.rotation, sh.flipX ? -sh.scale : sh.scale, sh.scale);
}

export function symbolPolys(l: Layer, doc: CrestDoc): Poly[] {
  if (l.kind !== 'symbol') throw new Error('не символ');
  const r = resolveSymbol(l, doc);
  const s = r.size / 512;
  return transform(flatten(getSymbolPath(l.symbol)!), r.x, r.y, r.rotation, r.flipX ? -s : s, s, [-256, -256]);
}

/** Контуры орнамента: разбираются все path из его разметки с учётом translate у группы. */
export function ornamentPolys(l: Layer): Poly[] {
  if (l.kind !== 'ornament') throw new Error('не орнамент');
  const svg = ORNAMENTS[l.ornament].draw(l.color, l.color2);
  const tr = /<g transform="translate\(([-\d.]+) ([-\d.]+)\)">/.exec(svg);
  const pre: Pt = tr ? [Number(tr[1]), Number(tr[2])] : [0, 0];
  const polys: Poly[] = [];
  for (const m of svg.matchAll(/ d="([^"]+)"/g)) polys.push(...flatten(m[1]));
  return transform(polys, l.x, l.y, l.rotation, l.flipX ? -l.scale : l.scale, l.scale, pre);
}

/** Прямоугольник надписи (с лентой для формы banner) как ломаная. */
export function textPolys(l: Layer): Poly[] {
  if (l.kind !== 'text') throw new Error('не надпись');
  const b = textBox(l);
  const hw = b.w / 2;
  const hh = b.h / 2;
  const rect: Poly = [[b.cx - hw, b.cy - hh], [b.cx + hw, b.cy - hh], [b.cx + hw, b.cy + hh], [b.cx - hw, b.cy + hh], [b.cx - hw, b.cy - hh]];
  return transform([rect], l.x, l.y, l.rotation, l.flipX ? -l.scale : l.scale, l.scale);
}

/** Контуры букв и ленты надписи в координатах холста. */
export function textInk(l: Layer): { glyphs: Poly[]; ribbon: Poly[] } {
  if (l.kind !== 'text') throw new Error('не надпись');
  const svg = renderTextBody(l);
  const glyphs: Poly[] = [];
  const ribbon: Poly[] = [];
  const sc = l.flipX ? -l.scale : l.scale;
  for (const m of svg.matchAll(/<path ([^>]*?)\/>/g)) {
    const d = /\bd="([^"]+)"/.exec(m[1])![1];
    const tr = /transform="([^"]+)"/.exec(m[1]);
    if (!tr) {
      ribbon.push(...transform(flatten(d), l.x, l.y, l.rotation, sc, l.scale));
      continue;
    }
    // translate(a b) [rotate(r)] [translate(c d)]
    const nums = [...tr[1].matchAll(/(translate|rotate)\(([^)]+)\)/g)].map((t) => ({ k: t[1], v: t[2].split(' ').map(Number) }));
    const t1 = nums[0].v;
    const rot = nums.find((t) => t.k === 'rotate')?.v[0] ?? 0;
    const t2 = nums.length > 1 && nums[nums.length - 1].k === 'translate' ? nums[nums.length - 1].v : [0, 0];
    const local = transform(flatten(d), t1[0], t1[1], rot, 1, 1, [t2[0], t2[1]]);
    glyphs.push(...transform(local, l.x, l.y, l.rotation, sc, l.scale));
  }
  return { glyphs, ribbon };
}

export function layerPolys(l: Layer, doc: CrestDoc): Poly[] {
  switch (l.kind) {
    case 'shield':
      return shieldPolys(l);
    case 'symbol':
      return symbolPolys(l, doc);
    case 'ornament':
      return ornamentPolys(l);
    case 'text':
      return textPolys(l);
  }
}

export { shieldToWorld };

/** Все ли точки фигуры лежат внутри `container` не ближе чем на `margin` от его края. Возвращает худший зазор. */
export function worstClearance(polys: Poly[], container: Poly[]): number {
  let worst = Infinity;
  for (const p of polys)
    for (const [x, y] of p) {
      const d = distToEdge(container, x, y);
      worst = Math.min(worst, inside(container, x, y) ? d : -d);
    }
  return worst;
}

/** Зеркальная симметрия относительно x = axis: наибольшее расстояние от точки до ближайшей точки отражения. */
export function mirrorError(polys: Poly[], axis: number, step = 1): number {
  const mirrored = polys.map((p) => p.map(([x, y]) => [2 * axis - x, y] as Pt));
  let worst = 0;
  for (const p of polys) for (let i = 0; i < p.length; i += step) worst = Math.max(worst, distToEdge(mirrored, p[i][0], p[i][1]));
  return worst;
}
