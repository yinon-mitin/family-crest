/** Округление координат: короткие числа делают SVG компактнее. */
export const n = (v: number): string => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

export const deg = (rad: number): number => (rad * 180) / Math.PI;

export const circle = (cx: number, cy: number, r: number): string =>
  `M${n(cx - r)},${n(cy)}a${n(r)},${n(r)} 0 1 0 ${n(2 * r)},0a${n(r)},${n(r)} 0 1 0 ${n(-2 * r)},0z`;

export const rect = (x: number, y: number, w: number, h: number): string =>
  `M${n(x)},${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;

export const poly = (pts: [number, number][]): string =>
  pts.length ? `M${pts.map(([x, y]) => `${n(x)},${n(y)}`).join('L')}z` : '';

/** Лист/зерно, вытянутое вдоль угла `angle`, с основанием в точке (x, y). */
export function leaf(x: number, y: number, angle: number, len: number, wid: number): string {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const P = (u: number, v: number): string => `${n(x + u * c - v * s)},${n(y + u * s + v * c)}`;
  return (
    `M${P(0, 0)}C${P(len * 0.3, wid)} ${P(len * 0.75, wid * 0.7)} ${P(len, 0)}` +
    `C${P(len * 0.75, -wid * 0.7)} ${P(len * 0.3, -wid)} ${P(0, 0)}z`
  );
}

export function star(cx: number, cy: number, outer: number, inner: number, points = 5, rot = -Math.PI / 2): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return poly(pts);
}

/** Заливаемый контур вдоль ломаной с переменной шириной (стебли, ветви, завитки). */
export function strokePoly(pts: [number, number][], widths: number[]): string {
  if (pts.length < 2) return '';
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (widths[i] ?? widths[widths.length - 1]) / 2;
    left.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    right.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return poly([...left, ...right.reverse()]);
}

/** Детерминированный генератор для «живых» орнаментов: результат всегда один и тот же. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
