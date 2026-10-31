import { beforeAll, describe, expect, test } from 'vitest';
import { loadAll } from './helpers.ts';
import { renderCrest } from '../src/render/renderCrest.ts';
import { detachSymbol, emptyDoc, makeOrnament, makeShield, makeSymbol, makeText, resolveSymbol } from '../src/model/doc.ts';
import { TEMPLATES } from '../src/model/templates.ts';
import { CATALOG } from '../src/data/catalog.ts';
import { getSymbolPath } from '../src/data/symbols.ts';
import { DIVISIONS, SHAPES } from '../src/render/shields.ts';
import { ORNAMENTS } from '../src/render/ornaments.ts';
import { PATTERNS } from '../src/render/patterns.ts';
import { layoutText } from '../src/render/fonts.ts';
import type { DivisionId, OrnamentId, PatternId, ShapeId } from '../src/model/types.ts';

beforeAll(loadAll);

// Только то, что одинаково переносится в браузер, PNG и PDF.
const FORBIDDEN = /<(text|image|foreignObject|filter|pattern|mask|linearGradient|radialGradient|use|style|script)\b/;

describe('каталог', () => {
  test('у каждого символа есть контур, название и значение', () => {
    for (const e of CATALOG) {
      expect(getSymbolPath(e.icon), e.icon).toBeTruthy();
      expect(e.name.length).toBeGreaterThan(1);
      expect(e.meaning.length).toBeGreaterThan(5);
    }
  });
  test('значки не повторяются', () => {
    expect(new Set(CATALOG.map((e) => e.icon)).size).toBe(CATALOG.length);
  });
});

describe('отрисовка', () => {
  test('результат детерминирован', () => {
    const doc = TEMPLATES[1].make();
    expect(renderCrest(doc)).toBe(renderCrest(doc));
  });

  test('все шаблоны используют только допустимые элементы и содержат символы', () => {
    for (const t of TEMPLATES) {
      const svg = renderCrest(t.make(), { attribution: true });
      expect(svg, t.id).not.toMatch(FORBIDDEN);
      expect(svg).toContain('viewBox="0 0 1000 1200"');
      expect(svg.length).toBeGreaterThan(2000);
    }
  });

  test('каждая форма, деление, узор и орнамент даёт допустимый SVG', () => {
    for (const shape of Object.keys(SHAPES) as ShapeId[])
      for (const division of Object.keys(DIVISIONS) as DivisionId[]) {
        const doc = emptyDoc();
        const sh = makeShield(shape, division);
        doc.layers = [sh, makeSymbol('lion', 0, 0, { slot: { shield: sh.id, field: 0 } })];
        expect(renderCrest(doc)).not.toMatch(FORBIDDEN);
      }
    for (const p of Object.keys(PATTERNS) as PatternId[]) {
      const doc = emptyDoc();
      doc.layers = [makeShield('heater', 'whole', { fields: [{ color: '#2c5aa0', pattern: p, patternColor: '#ffffff' }] })];
      expect(renderCrest(doc)).not.toMatch(FORBIDDEN);
    }
    for (const o of Object.keys(ORNAMENTS) as OrnamentId[]) {
      const doc = emptyDoc();
      doc.layers = [makeOrnament(o)];
      const svg = renderCrest(doc);
      expect(svg).not.toMatch(FORBIDDEN);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  test('числа в контурах конечные', () => {
    for (const t of TEMPLATES) expect(renderCrest(t.make())).not.toMatch(/NaN|Infinity|undefined/);
  });

  test('редакторский режим добавляет data-id, экспорт — нет', () => {
    const doc = TEMPLATES[0].make();
    expect(renderCrest(doc, { editor: true })).toContain('data-id=');
    expect(renderCrest(doc)).not.toContain('data-id=');
  });

  test('текст на кириллице превращается в контуры, неизвестные знаки сообщаются', () => {
    const g = layoutText('Семья Ивановых — вместе', 'display', true);
    expect(g.glyphs.length).toBeGreaterThan(15);
    expect(g.missing).toEqual([]);
    expect(layoutText('Дом 🏠', 'serif', false).missing).toContain('🏠');
    const doc = emptyDoc();
    doc.layers = [makeText('Вместе', { form: 'arcUp' })];
    expect(renderCrest(doc)).toContain('<path transform=');
  });

  test('скрытые слои не рисуются', () => {
    const doc = emptyDoc();
    const s = makeSymbol('lion', 500, 500);
    doc.layers = [{ ...s, hidden: true }];
    expect(renderCrest(doc)).not.toContain(getSymbolPath('lion')!);
  });
});

describe('привязка к полям', () => {
  test('смена формы и деления не теряет символы: положение вычисляется заново', () => {
    const sh = makeShield('heater', 'quarterly');
    const sym = makeSymbol('lion', 0, 0, { slot: { shield: sh.id, field: 3 } });
    const doc = { ...emptyDoc(), layers: [sh, sym] };
    const a = resolveSymbol(sym, doc);
    const doc2 = { ...doc, layers: [{ ...sh, division: 'whole' as const }, sym] };
    const b = resolveSymbol(sym, doc2); // поля 3 больше нет: берётся последнее
    expect(Number.isFinite(b.x) && Number.isFinite(b.y) && b.size > 0).toBe(true);
    expect(a.x).not.toBe(b.x);
  });

  test('открепление сохраняет видимое положение и размер', () => {
    const sh = makeShield('round', 'fess', { x: 480, y: 620, scale: 1.2, rotation: 10 });
    const sym = makeSymbol('oak', 0, 0, { slot: { shield: sh.id, field: 1 } });
    const doc = { ...emptyDoc(), layers: [sh, sym] };
    const before = resolveSymbol(sym, doc);
    const free = detachSymbol(sym, doc);
    const after = resolveSymbol(free, doc);
    expect(free.slot).toBeUndefined();
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
    expect(after.size).toBeCloseTo(before.size, 5);
    expect(after.rotation).toBeCloseTo(before.rotation, 5);
  });
});
