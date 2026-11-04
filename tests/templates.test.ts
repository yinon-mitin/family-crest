import { beforeAll, describe, expect, test } from 'vitest';
import { loadAll } from './helpers.ts';
import { TEMPLATES } from '../src/model/templates.ts';
import { resolveSymbol, shieldToWorld } from '../src/model/doc.ts';
import { DIVISIONS, SHAPES, shieldFields } from '../src/render/shields.ts';
import { ORNAMENTS } from '../src/render/ornaments.ts';
import { flatten, distToEdge, inside } from '../src/render/pathgeom.ts';
import type { DivisionId, OrnamentId, ShapeId, ShieldLayer, SymbolLayer } from '../src/model/types.ts';
import { makeOrnament } from '../src/model/doc.ts';
import { bbox, mirrorError, ornamentPolys, shieldPolys, symbolPolys, textInk, transform, worstClearance } from './geom.ts';
import type { Poly } from './geom.ts';
import { setLang } from '../src/i18n/index.ts';

beforeAll(loadAll);

const W = 1000;
const H = 1200;
/** Зазор до края холста, чтобы ничего не обрезалось при экспорте и печати. */
const CANVAS_MARGIN = 8;
/** Зазор между значком и краем щита или поля: обводка 8 px и ореол значка. */
const SYMBOL_MARGIN = 12;
const AXIS = 500;

const shieldOf = (doc: ReturnType<(typeof TEMPLATES)[number]['make']>): ShieldLayer => doc.layers.find((l): l is ShieldLayer => l.kind === 'shield')!;

function worldField(sh: ShieldLayer, i: number): Poly[] {
  return transform(flatten(shieldFields(sh.shape, sh.division)[i].d), sh.x, sh.y, sh.rotation, sh.flipX ? -sh.scale : sh.scale, sh.scale);
}

// Надписи в шаблонах зависят от языка и по длине различаются, поэтому проверяются оба.
const CASES = (['ru', 'en'] as const).flatMap((lang) =>
  TEMPLATES.map((t) => {
    setLang(lang);
    const doc = t.make();
    setLang('ru');
    return [`${t.id}, ${lang}`, doc] as const;
  }),
);

describe.each(CASES)('шаблон «%s»', (_id, doc) => {
  const sh = shieldOf(doc);
  const shield = shieldPolys(sh);

  test('ничего не выходит за холст', () => {
    const bad: string[] = [];
    for (const l of doc.layers) {
      const polys = l.kind === 'text' ? [...textInk(l).glyphs, ...textInk(l).ribbon] : l.kind === 'symbol' ? symbolPolys(l, doc) : l.kind === 'ornament' ? ornamentPolys(l) : shieldPolys(l);
      const b = bbox(polys);
      if (b.x0 < CANVAS_MARGIN || b.y0 < CANVAS_MARGIN || b.x1 > W - CANVAS_MARGIN || b.y1 > H - CANVAS_MARGIN)
        bad.push(`${l.kind} [${b.x0 | 0}..${b.x1 | 0}]×[${b.y0 | 0}..${b.y1 | 0}]`);
    }
    expect(bad).toEqual([]);
  });

  test('значки лежат внутри щита и своего поля, не касаясь друг друга', () => {
    const bad: string[] = [];
    const symbols = doc.layers.filter((l): l is SymbolLayer => l.kind === 'symbol');
    const boxes = symbols.map((l) => bbox(symbolPolys(l, doc)));
    symbols.forEach((l, i) => {
      const ink = symbolPolys(l, doc);
      const inShield = worstClearance(ink, shield);
      if (inShield < SYMBOL_MARGIN) bad.push(`${l.symbol}: до края щита ${inShield.toFixed(1)}`);
      if (l.slot) {
        const inField = worstClearance(ink, worldField(sh, Math.min(l.slot.field, DIVISIONS[sh.division].count - 1)));
        if (inField < SYMBOL_MARGIN) bad.push(`${l.symbol}: до границы поля ${inField.toFixed(1)}`);
        const r = resolveSymbol(l, doc);
        const b = boxes[i];
        const off = Math.abs((b.x0 + b.x1) / 2 - r.x);
        if (off > 0.06 * r.size) bad.push(`${l.symbol}: смещён от центра поля на ${off.toFixed(1)}`);
      }
      boxes.forEach((o, j) => {
        const b = boxes[i];
        if (j > i && b.x0 < o.x1 + 4 && o.x0 < b.x1 + 4 && b.y0 < o.y1 + 4 && o.y0 < b.y1 + 4) bad.push(`${l.symbol} пересекается с ${symbols[j].symbol}`);
      });
    });
    expect(bad).toEqual([]);
  });

  test('древо жизни на щите целиком помещается в щит', () => {
    for (const l of doc.layers)
      if (l.kind === 'ornament' && l.ornament === 'tree') expect(worstClearance(ornamentPolys(l), shield)).toBeGreaterThanOrEqual(SYMBOL_MARGIN);
  });

  test('щит, орнаменты и надписи симметричны и стоят на оси', () => {
    const bad: string[] = [];
    expect(sh.x).toBe(AXIS);
    expect(sh.rotation).toBe(0);
    expect(sh.flipX).toBe(false);
    const sErr = mirrorError(shield, AXIS);
    if (sErr > 1) bad.push(`щит: ${sErr.toFixed(1)}`);
    for (const l of doc.layers) {
      if (l.kind === 'ornament') {
        if (l.x !== AXIS) bad.push(`${l.ornament}: x=${l.x}`);
        const e = mirrorError(ornamentPolys(l), AXIS, 4);
        if (e > 1.5) bad.push(`${l.ornament}: ${e.toFixed(1)}`);
      }
      if (l.kind === 'text') {
        const b = bbox([...textInk(l).glyphs, ...textInk(l).ribbon]);
        const c = (b.x0 + b.x1) / 2;
        if (Math.abs(c - AXIS) > 6) bad.push(`надпись «${l.text}»: центр ${c.toFixed(1)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('буквы и ленты не наезжают на щит и значки', () => {
    const bad: string[] = [];
    const others = doc.layers.filter((l) => l.kind === 'symbol').map((l) => symbolPolys(l, doc));
    for (const l of doc.layers) {
      if (l.kind !== 'text') continue;
      const { glyphs, ribbon } = textInk(l);
      const ink = l.form === 'banner' ? ribbon : glyphs;
      const hit = (polys: Poly[]): boolean => ink.some((p) => p.some(([x, y]) => inside(polys, x, y) || distToEdge(polys, x, y) < 4));
      if (hit(shield)) bad.push(`«${l.text}» задевает щит`);
      for (const o of others) if (hit(o)) bad.push(`«${l.text}» задевает значок`);
      for (const o of doc.layers) {
        // Лента надписи может лежать поверх венка, но буквы не должны задевать кольца и рамки.
        if (o.kind !== 'ornament' || l.form === 'banner') continue;
        if (hit(ornamentPolys(o))) bad.push(`«${l.text}» задевает ${o.ornament}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('орнаменты', () => {
  test('все орнаменты зеркально симметричны', () => {
    const bad: string[] = [];
    for (const id of Object.keys(ORNAMENTS) as OrnamentId[]) {
      const e = mirrorError(ornamentPolys(makeOrnament(id)), 500, 4);
      if (e > 1.5) bad.push(`${id}: ${e.toFixed(1)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('поля щитов', () => {
  const shapes = Object.keys(SHAPES) as ShapeId[];
  const divisions = Object.keys(DIVISIONS) as DivisionId[];

  test('для любой формы и деления значок помещается в своё поле', () => {
    const bad: string[] = [];
    for (const shape of shapes) {
      const sp = flatten(SHAPES[shape].d);
      for (const div of divisions)
        shieldFields(shape, div).forEach((f, i) => {
          const fp = flatten(f.d);
          const half = 0.49 * f.size;
          let worst = Infinity;
          for (let a = 0; a <= 12; a++)
            for (let b = 0; b <= 12; b++) {
              if (a % 12 && b % 12) continue;
              const x = f.x - half + (2 * half * a) / 12;
              const y = f.y - half + (2 * half * b) / 12;
              const c = (poly: Poly[]): number => (inside(poly, x, y) ? distToEdge(poly, x, y) : -distToEdge(poly, x, y));
              worst = Math.min(worst, c(sp), c(fp));
            }
          if (worst < 5) bad.push(`${shape}/${div}#${i}: ${worst.toFixed(1)}`);
        });
    }
    expect(bad).toEqual([]);
  });

  test('симметричные деления дают зеркальные поля', () => {
    const bad: string[] = [];
    const pairs: Partial<Record<DivisionId, [number, number][]>> = { pale: [[0, 1]], quarterly: [[0, 1], [2, 3]], pall: [[1, 2]] };
    for (const shape of shapes) {
      for (const div of divisions) {
        const f = shieldFields(shape, div);
        for (const [a, b] of pairs[div] ?? []) {
          if (Math.abs(f[a].x + f[b].x) > 0.01 || Math.abs(f[a].y - f[b].y) > 0.01 || Math.abs(f[a].size - f[b].size) > 0.01) bad.push(`${shape}/${div} ${a}↔${b}`);
        }
        if (['whole', 'fess', 'fess3', 'chevron'].includes(div)) f.forEach((g, i) => Math.abs(g.x) > 0.01 && bad.push(`${shape}/${div}#${i} x=${g.x}`));
      }
    }
    expect(bad).toEqual([]);
  });

  test('привязанный значок остаётся внутри при повороте и отражении щита', () => {
    const sh = { ...TEMPLATES[1].make().layers[0] } as ShieldLayer;
    const [x, y] = shieldToWorld({ ...sh, flipX: true, rotation: 0 }, 100, 0);
    expect(x).toBe(sh.x - 100 * sh.scale);
    expect(y).toBe(sh.y);
  });
});
