import type { DivisionId, FieldStyle, ShapeId } from '../model/types.ts';
import { poly } from './geometry.ts';
import { distToEdge, flatten, inside } from './pathgeom.ts';
import type { Poly } from './pathgeom.ts';

export interface ShapeDef {
  name: string;
  d: string;
  /** Половина ширины и высоты в локальных координатах щита. */
  w: number;
  h: number;
  /** Насколько поля и символы сдвигаются к центру у фигур с узкими краями. */
  inset: number;
  sizeK: number;
}

const ellipse = (rx: number, ry: number): string =>
  `M0,${-ry}A${rx},${ry} 0 1 1 0,${ry}A${rx},${ry} 0 1 1 0,${-ry}Z`;

export const SHAPES: Record<ShapeId, ShapeDef> = {
  heater: {
    name: 'Классический',
    d: 'M-300,-360H300V-60C300,150 160,290 0,360C-160,290 -300,150 -300,-60Z',
    w: 300, h: 360, inset: 1, sizeK: 1,
  },
  french: {
    name: 'Закруглённый',
    d: 'M-290,-350H290V30A290,330 0 0 1 -290,30Z',
    w: 290, h: 340, inset: 1, sizeK: 1,
  },
  round: { name: 'Круглый', d: ellipse(320, 320), w: 320, h: 320, inset: 0.82, sizeK: 0.9 },
  oval: { name: 'Овальный', d: ellipse(285, 360), w: 285, h: 360, inset: 0.84, sizeK: 0.9 },
  kite: {
    name: 'Рыцарский',
    d: 'M-270,-330C-120,-385 120,-385 270,-330C310,-100 230,170 0,370C-230,170 -310,-100 -270,-330Z',
    w: 290, h: 350, inset: 0.92, sizeK: 0.95,
  },
  lozenge: {
    name: 'Ромб',
    d: 'M0,-370L300,0L0,370L-300,0Z',
    w: 300, h: 370, inset: 0.56, sizeK: 0.62,
  },
  notched: {
    name: 'С вырезом',
    d: 'M-300,-350H-90Q0,-285 90,-350H300V-40C300,150 150,290 0,360C-150,290 -300,150 -300,-40Z',
    w: 300, h: 355, inset: 1, sizeK: 1,
  },
  hexagon: {
    name: 'Шестиугольный',
    d: 'M0,-370L295,-190V190L0,370L-295,190V-190Z',
    w: 295, h: 370, inset: 0.86, sizeK: 0.9,
  },
};

export interface FieldDef {
  /** Контур поля с запасом за пределы щита (обрезается по форме щита). */
  d: string;
  /** Точка закрепления символа и подходящий размер, в долях полуразмеров щита. */
  ax: number;
  ay: number;
  k: number;
}

export interface DivisionDef {
  name: string;
  count: number;
  fields(W: number, H: number): FieldDef[];
}

const B = 2000;
const full = poly([[-B, -B], [B, -B], [B, B], [-B, B]]);

export const DIVISIONS: Record<DivisionId, DivisionDef> = {
  whole: {
    name: 'Целый щит',
    count: 1,
    fields: () => [{ d: full, ax: 0, ay: -0.06, k: 1.2 }],
  },
  pale: {
    name: 'Вертикально',
    count: 2,
    fields: () => [
      { d: poly([[-B, -B], [0, -B], [0, B], [-B, B]]), ax: -0.5, ay: -0.08, k: 0.9 },
      { d: poly([[0, -B], [B, -B], [B, B], [0, B]]), ax: 0.5, ay: -0.08, k: 0.9 },
    ],
  },
  fess: {
    name: 'Горизонтально',
    count: 2,
    fields: () => [
      { d: poly([[-B, -B], [B, -B], [B, 0], [-B, 0]]), ax: 0, ay: -0.5, k: 0.95 },
      { d: poly([[-B, 0], [B, 0], [B, B], [-B, B]]), ax: 0, ay: 0.42, k: 0.8 },
    ],
  },
  bend: {
    name: 'Диагональ ╲',
    count: 2,
    fields: (W, H) => [
      { d: poly([[-2 * W, -2 * H], [2 * W, 2 * H], [B, B], [B, -B], [-B, -B]]), ax: 0.38, ay: -0.4, k: 0.7 },
      { d: poly([[-2 * W, -2 * H], [2 * W, 2 * H], [B, B], [-B, B], [-B, -B]]), ax: -0.36, ay: 0.3, k: 0.65 },
    ],
  },
  bendSinister: {
    name: 'Диагональ ╱',
    count: 2,
    fields: (W, H) => [
      { d: poly([[2 * W, -2 * H], [-2 * W, 2 * H], [-B, B], [-B, -B], [B, -B]]), ax: -0.38, ay: -0.4, k: 0.7 },
      { d: poly([[2 * W, -2 * H], [-2 * W, 2 * H], [-B, B], [B, B], [B, -B]]), ax: 0.36, ay: 0.3, k: 0.65 },
    ],
  },
  quarterly: {
    name: 'Четыре части',
    count: 4,
    fields: () => [
      { d: poly([[-B, -B], [0, -B], [0, 0], [-B, 0]]), ax: -0.5, ay: -0.5, k: 0.82 },
      { d: poly([[0, -B], [B, -B], [B, 0], [0, 0]]), ax: 0.5, ay: -0.5, k: 0.82 },
      { d: poly([[-B, 0], [0, 0], [0, B], [-B, B]]), ax: -0.46, ay: 0.38, k: 0.66 },
      { d: poly([[0, 0], [B, 0], [B, B], [0, B]]), ax: 0.46, ay: 0.38, k: 0.66 },
    ],
  },
  chevron: {
    name: 'Стропило',
    count: 2,
    fields: (W, H) => {
      const top = -0.1 * H;
      const far = top + ((0.6 * H) / W) * B;
      return [
        { d: poly([[-B, -B], [B, -B], [B, far], [0, top], [-B, far]]), ax: 0, ay: -0.55, k: 0.85 },
        { d: poly([[-B, far], [0, top], [B, far], [B, B], [-B, B]]), ax: 0, ay: 0.55, k: 0.56 },
      ];
    },
  },
  pall: {
    name: 'Вилы (три части)',
    count: 3,
    fields: (W, H) => [
      { d: poly([[0, 0], [2 * W, -2 * H], [B, -B], [-B, -B], [-2 * W, -2 * H]]), ax: 0, ay: -0.58, k: 0.62 },
      { d: poly([[-2 * W, -2 * H], [0, 0], [0, B], [-B, B], [-B, -B]]), ax: -0.46, ay: 0.3, k: 0.58 },
      { d: poly([[2 * W, -2 * H], [0, 0], [0, B], [B, B], [B, -B]]), ax: 0.46, ay: 0.3, k: 0.58 },
    ],
  },
  fess3: {
    name: 'Три пояса',
    count: 3,
    fields: (_W, H) => [
      { d: poly([[-B, -B], [B, -B], [B, -H / 3], [-B, -H / 3]]), ax: 0, ay: -0.67, k: 0.7 },
      { d: poly([[-B, -H / 3], [B, -H / 3], [B, H / 3], [-B, H / 3]]), ax: 0, ay: 0, k: 0.7 },
      { d: poly([[-B, H / 3], [B, H / 3], [B, B], [-B, B]]), ax: 0, ay: 0.62, k: 0.52 },
    ],
  },
};

export const fieldCount = (d: DivisionId): number => DIVISIONS[d].count;

export interface FieldGeometry {
  d: string;
  x: number;
  y: number;
  size: number;
}

// ---------- подгонка символов под поля ----------
//
// Ручные размеры и точки закрепления в DIVISIONS задают желаемое положение. Подгонка проверяет его на
// конкретной форме щита: если квадрат символа выходит за контур щита или за границу поля, символ
// уменьшается и сдвигается к ближайшему месту, где он помещается целиком.

const CELL = 5;
/** Зазор до контура и разделительных линий: половина обводки и ореол символа. */
const MARGIN = 9;
/** Половина стороны квадрата, в который вписывается значок вместе с ореолом, в долях размера символа. */
const INK_HALF = 0.49;
const SIZE_STEPS = [1, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52, 0.46];

interface Clearance {
  x0: number;
  y0: number;
  cols: number;
  rows: number;
  /** Расстояние от центра ячейки до края щита; отрицательное — снаружи. */
  d: Float32Array;
}

const shapePolys: Partial<Record<ShapeId, Poly[]>> = {};
const clearances: Partial<Record<ShapeId, Clearance>> = {};
const fitted = new Map<string, FieldGeometry[]>();

const polysOf = (shape: ShapeId): Poly[] => (shapePolys[shape] ??= flatten(SHAPES[shape].d));

function clearanceOf(shape: ShapeId): Clearance {
  const hit = clearances[shape];
  if (hit) return hit;
  const polys = polysOf(shape);
  let mx = 0;
  let my = 0;
  for (const p of polys)
    for (const [x, y] of p) {
      mx = Math.max(mx, Math.abs(x));
      my = Math.max(my, Math.abs(y));
    }
  const halfCols = Math.ceil(mx / CELL);
  const halfRows = Math.ceil(my / CELL);
  const c: Clearance = { x0: -halfCols * CELL, y0: -halfRows * CELL, cols: 2 * halfCols, rows: 2 * halfRows, d: new Float32Array(4 * halfCols * halfRows) };
  for (let j = 0; j < c.rows; j++)
    for (let i = 0; i < c.cols; i++) {
      const x = c.x0 + (i + 0.5) * CELL;
      const y = c.y0 + (j + 0.5) * CELL;
      const dist = distToEdge(polys, x, y);
      c.d[j * c.cols + i] = inside(polys, x, y) ? dist : -dist;
    }
  return (clearances[shape] = c);
}

function fitField(shape: ShapeId, field: FieldGeometry, single: boolean): FieldGeometry {
  const cl = clearanceOf(shape);
  const fp = single ? null : flatten(field.d);
  const { cols, rows } = cl;
  // Суммы по префиксам: «все ли ячейки квадрата свободны» проверяется за O(1).
  const sum = new Int32Array((cols + 1) * (rows + 1));
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      let ok = cl.d[j * cols + i] >= MARGIN;
      if (ok && fp) {
        const x = cl.x0 + (i + 0.5) * CELL;
        const y = cl.y0 + (j + 0.5) * CELL;
        ok = inside(fp, x, y) && distToEdge(fp, x, y) >= MARGIN;
      }
      sum[(j + 1) * (cols + 1) + i + 1] = (ok ? 1 : 0) + sum[j * (cols + 1) + i + 1] + sum[(j + 1) * (cols + 1) + i] - sum[j * (cols + 1) + i];
    }
  const fits = (cx: number, cy: number, half: number): boolean => {
    const i0 = Math.floor((cx - half - cl.x0) / CELL);
    const i1 = Math.ceil((cx + half - cl.x0) / CELL);
    const j0 = Math.floor((cy - half - cl.y0) / CELL);
    const j1 = Math.ceil((cy + half - cl.y0) / CELL);
    if (i0 < 0 || j0 < 0 || i1 > cols || j1 > rows) return false;
    const w = cols + 1;
    return sum[j1 * w + i1] - sum[j0 * w + i1] - sum[j1 * w + i0] + sum[j0 * w + i0] === (i1 - i0) * (j1 - j0);
  };

  // Поле на оси щита остаётся на оси: сетка симметрична, поэтому сдвиг к нулю не нарушает посадку.
  const centered = (g: FieldGeometry): FieldGeometry => (field.x === 0 ? { ...g, x: 0 } : g);
  let fallback: FieldGeometry | null = null;
  for (const k of SIZE_STEPS) {
    const size = field.size * k;
    const half = size * INK_HALF;
    if (fits(field.x, field.y, half)) return { ...field, size };
    let best: { x: number; y: number; dist: number } | null = null;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = cl.x0 + (i + 0.5) * CELL;
        const y = cl.y0 + (j + 0.5) * CELL;
        const dist = Math.round(Math.hypot(x - field.x, y - field.y) * 1e4) / 1e4;
        if (best && (dist > best.dist || (dist === best.dist && (Math.abs(x) > Math.abs(best.x) || (Math.abs(x) === Math.abs(best.x) && y >= best.y))))) continue;
        if (fits(x, y, half)) best = { x, y, dist };
      }
    if (best) {
      fallback = { ...field, x: best.x, y: best.y, size };
      // Далеко сдвигать нельзя: символ должен остаться в «своём» месте поля.
      if (best.dist <= 0.5 * size) return centered(fallback);
    }
  }
  return fallback ? centered(fallback) : field;
}

/** Поля щита в его локальных координатах: контур, точка закрепления и размер символа. */
export function shieldFields(shape: ShapeId, division: DivisionId): FieldGeometry[] {
  const key = `${shape}|${division}`;
  const hit = fitted.get(key);
  if (hit) return hit;
  const s = SHAPES[shape];
  const def = DIVISIONS[division];
  const fields = def.fields(s.w, s.h).map((f) => {
    const wish: FieldGeometry = { d: f.d, x: f.ax * s.w * s.inset, y: f.ay * s.h * s.inset, size: f.k * s.w * s.sizeK };
    return fitField(shape, wish, def.count === 1);
  });
  fitted.set(key, fields);
  return fields;
}

export function defaultFields(division: DivisionId, base: FieldStyle[] = []): FieldStyle[] {
  const palette = ['#2c5aa0', '#e9e6df', '#b3282d', '#2f7a4a'];
  return Array.from({ length: DIVISIONS[division].count }, (_, i) => {
    const prev = base[i];
    return prev ?? { color: palette[i % palette.length], pattern: null, patternColor: '#ffffff' };
  });
}
