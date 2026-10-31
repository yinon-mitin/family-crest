import type {
  CrestDoc,
  DivisionId,
  Layer,
  OrnamentId,
  OrnamentLayer,
  ShapeId,
  ShieldLayer,
  SymbolLayer,
  TextLayer,
} from './types.ts';
import { CANVAS_H, CANVAS_W } from './types.ts';
import { DEFAULT_INK, OUTLINE_DEFAULT } from '../data/tinctures.ts';
import { ORNAMENTS } from '../render/ornaments.ts';
import { defaultFields, DIVISIONS, SHAPES, shieldFields } from '../render/shields.ts';
import { textBox } from '../render/text.ts';

export const SYMBOL_BASE = 200;
export const TEXT_SCALE = 0.6;

let counter = 0;
export const newId = (): string => `l${Date.now().toString(36)}${(counter++).toString(36)}`;

export const emptyDoc = (): CrestDoc => ({ version: 1, family: '', background: null, snap: false, layers: [] });

const base = () => ({ id: newId(), x: CANVAS_W / 2, y: CANVAS_H / 2, scale: 1, rotation: 0, flipX: false, hidden: false, locked: false, note: '' });

export function makeShield(shape: ShapeId = 'heater', division: DivisionId = 'whole', over: Partial<ShieldLayer> = {}): ShieldLayer {
  return {
    ...base(),
    kind: 'shield',
    shape,
    division,
    fields: defaultFields(division),
    outline: OUTLINE_DEFAULT,
    outlineWidth: 8,
    ...over,
  };
}

export function makeSymbol(symbol: string, x: number, y: number, over: Partial<SymbolLayer> = {}): SymbolLayer {
  return { ...base(), kind: 'symbol', x, y, scale: 1, symbol, color: DEFAULT_INK, halo: OUTLINE_DEFAULT, ...over };
}

export function makeOrnament(ornament: OrnamentId, over: Partial<OrnamentLayer> = {}): OrnamentLayer {
  const d = ORNAMENTS[ornament];
  return { ...base(), kind: 'ornament', ornament, x: d.x, y: d.y, scale: d.scale, color: d.color, color2: d.color2, ...over };
}

export function makeText(text: string, over: Partial<TextLayer> = {}): TextLayer {
  return {
    ...base(),
    kind: 'text',
    text,
    font: 'display',
    bold: true,
    form: 'banner',
    color: '#fbf6e8',
    bannerColor: '#b3282d',
    radius: 380,
    scale: TEXT_SCALE,
    y: 1100,
    ...over,
  };
}

// ---------- геометрия ----------

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Поворот в градусах вокруг центра. */
  rot: number;
}

export const findLayer = (doc: CrestDoc, id: string | null): Layer | undefined =>
  id ? doc.layers.find((l) => l.id === id) : undefined;

/** Перевод точки из локальных координат щита в координаты холста. */
export function shieldToWorld(sh: ShieldLayer, px: number, py: number): [number, number] {
  const x = (sh.flipX ? -px : px) * sh.scale;
  const y = py * sh.scale;
  const a = (sh.rotation * Math.PI) / 180;
  return [sh.x + x * Math.cos(a) - y * Math.sin(a), sh.y + x * Math.sin(a) + y * Math.cos(a)];
}

export function shieldBox(sh: ShieldLayer): Box {
  const s = SHAPES[sh.shape];
  return { cx: sh.x, cy: sh.y, w: 2 * s.w * sh.scale, h: 2 * s.h * sh.scale, rot: sh.rotation };
}

export interface ResolvedSymbol {
  x: number;
  y: number;
  size: number;
  rotation: number;
  flipX: boolean;
}

export function slotShield(l: SymbolLayer, doc: CrestDoc): ShieldLayer | undefined {
  if (!l.slot) return undefined;
  const sh = findLayer(doc, l.slot.shield);
  return sh?.kind === 'shield' ? sh : undefined;
}

export function resolveSymbol(l: SymbolLayer, doc: CrestDoc): ResolvedSymbol {
  const sh = slotShield(l, doc);
  if (l.slot && sh) {
    const fields = shieldFields(sh.shape, sh.division);
    const f = fields[Math.min(l.slot.field, fields.length - 1)];
    const [x, y] = shieldToWorld(sh, f.x, f.y);
    return { x, y, size: f.size * sh.scale * l.scale, rotation: l.rotation + sh.rotation, flipX: l.flipX !== sh.flipX };
  }
  return { x: l.x, y: l.y, size: SYMBOL_BASE * l.scale, rotation: l.rotation, flipX: l.flipX };
}

export function layerBox(l: Layer, doc: CrestDoc): Box {
  switch (l.kind) {
    case 'shield':
      return shieldBox(l);
    case 'symbol': {
      const r = resolveSymbol(l, doc);
      return { cx: r.x, cy: r.y, w: r.size, h: r.size, rot: r.rotation };
    }
    case 'ornament': {
      const d = ORNAMENTS[l.ornament];
      return { cx: l.x, cy: l.y, w: d.w * l.scale, h: d.h * l.scale, rot: l.rotation };
    }
    case 'text': {
      const b = textBox(l);
      const a = (l.rotation * Math.PI) / 180;
      const ox = b.cx * l.scale;
      const oy = b.cy * l.scale;
      return {
        cx: l.x + ox * Math.cos(a) - oy * Math.sin(a),
        cy: l.y + ox * Math.sin(a) + oy * Math.cos(a),
        w: b.w * l.scale,
        h: b.h * l.scale,
        rot: l.rotation,
      };
    }
  }
}

/** Поле щита, ближайшее к точке холста, и расстояние до его центра. */
export function nearestSlot(doc: CrestDoc, x: number, y: number): { shield: ShieldLayer; field: number; dist: number } | null {
  let best: { shield: ShieldLayer; field: number; dist: number } | null = null;
  for (const l of doc.layers) {
    if (l.kind !== 'shield' || l.hidden) continue;
    shieldFields(l.shape, l.division).forEach((f, i) => {
      const [fx, fy] = shieldToWorld(l, f.x, f.y);
      const dist = Math.hypot(fx - x, fy - y);
      if (!best || dist < best.dist) best = { shield: l, field: i, dist };
    });
  }
  return best;
}

/** Первое свободное поле первого щита: туда попадает следующий добавленный символ. */
export function freeSlot(doc: CrestDoc): { shield: ShieldLayer; field: number } | null {
  for (const l of doc.layers) {
    if (l.kind !== 'shield' || l.hidden) continue;
    const used = new Set(doc.layers.flatMap((s) => (s.kind === 'symbol' && s.slot?.shield === l.id ? [s.slot.field] : [])));
    for (let i = 0; i < DIVISIONS[l.division].count; i++) if (!used.has(i)) return { shield: l, field: i };
  }
  return null;
}

/** Превращает привязанный символ в свободный: положение и размер становятся обычными. */
export function detachSymbol(l: SymbolLayer, doc: CrestDoc): SymbolLayer {
  if (!l.slot) return l;
  const r = resolveSymbol(l, doc);
  return { ...l, slot: undefined, x: r.x, y: r.y, scale: r.size / SYMBOL_BASE, rotation: r.rotation, flipX: r.flipX };
}

export function attachSymbol(l: SymbolLayer, shield: ShieldLayer, field: number): SymbolLayer {
  return { ...l, slot: { shield: shield.id, field }, scale: 1, rotation: 0, flipX: false };
}
