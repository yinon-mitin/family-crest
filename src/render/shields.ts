import type { DivisionId, FieldStyle, ShapeId } from '../model/types.ts';
import { poly } from './geometry.ts';

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

/** Поля щита в его локальных координатах: контур, точка закрепления и размер символа. */
export function shieldFields(shape: ShapeId, division: DivisionId): FieldGeometry[] {
  const s = SHAPES[shape];
  return DIVISIONS[division].fields(s.w, s.h).map((f) => ({
    d: f.d,
    x: f.ax * s.w * s.inset,
    y: f.ay * s.h * s.inset,
    size: f.k * s.w * s.sizeK,
  }));
}

export function defaultFields(division: DivisionId, base: FieldStyle[] = []): FieldStyle[] {
  const palette = ['#2c5aa0', '#e9e6df', '#b3282d', '#2f7a4a'];
  return Array.from({ length: DIVISIONS[division].count }, (_, i) => {
    const prev = base[i];
    return prev ?? { color: palette[i % palette.length], pattern: null, patternColor: '#ffffff' };
  });
}
