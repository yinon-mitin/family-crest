import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { loadAll } from './helpers.ts';
import { emptyDoc, makeOrnament, makeShield, makeSymbol } from '../src/model/doc.ts';
import { fromFile, parseDoc, toFile } from '../src/model/serialize.ts';
import { TEMPLATES } from '../src/model/templates.ts';
import { addSymbol, commit, deleteLayer, duplicateLayer, getState, moveLayer, openDoc, redo, undo, updateLayer } from '../src/model/store.ts';

beforeAll(loadAll);

describe('проверка данных', () => {
  test('файл проекта: сохранение и открытие возвращают тот же герб', () => {
    for (const t of TEMPLATES) {
      const doc = t.make();
      const back = fromFile(toFile(doc));
      expect(back).toEqual(doc);
    }
  });

  test('чужие и повреждённые файлы отвергаются', () => {
    expect(fromFile('не json')).toBeNull();
    expect(fromFile('{"app":"other","doc":{}}')).toBeNull();
    expect(fromFile('{"app":"family-crest","doc":{"layers":5}}')).toBeNull();
    expect(parseDoc(null)).toBeNull();
    expect(parseDoc([])).toBeNull();
  });

  test('файлы со старым именем приложения открываются', () => {
    const doc = parseDoc({})!;
    expect(fromFile(JSON.stringify({ app: 'family-tree', doc }))).toEqual(doc);
  });

  test('значения приводятся к допустимым, неизвестное отбрасывается', () => {
    const doc = parseDoc({
      family: 'x'.repeat(500),
      background: 'red',
      layers: [
        { kind: 'symbol', symbol: 'lion', color: 'javascript:alert(1)', halo: '"><script>', x: 1e9, scale: -4, note: 'a'.repeat(5000), id: '"><img src=x>' },
        { kind: 'symbol', symbol: 'нет-такого' },
        { kind: 'unknown' },
        { kind: 'shield', shape: 'cube', division: 'pall', fields: [{ color: 'bad', pattern: 'nope' }] },
        { kind: 'text', text: '<b>x</b>'.repeat(100), font: 'comic', form: 'spiral' },
        'строка',
      ],
    })!;
    expect(doc.family).toHaveLength(80);
    expect(doc.background).toBe('#ffffff');
    expect(doc.layers).toHaveLength(3);
    const [sym, shield, text] = doc.layers;
    if (sym.kind !== 'symbol' || shield.kind !== 'shield' || text.kind !== 'text') throw new Error('порядок слоёв');
    expect(sym.color).toBe('#e0b44c');
    expect(sym.halo).toBe('#1c1c24');
    expect(sym.x).toBeLessThanOrEqual(3000);
    expect(sym.scale).toBeGreaterThan(0);
    expect(sym.note).toHaveLength(1000);
    expect(sym.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(shield.shape).toBe('heater');
    expect(shield.fields).toHaveLength(3); // у «вил» три поля
    expect(shield.fields[0].pattern).toBe('stripes');
    expect(text.text).toHaveLength(120);
    expect(text.font).toBe('display');
    expect(text.form).toBe('line');
  });

  test('привязка к несуществующему щиту снимается, символ остаётся', () => {
    const doc = parseDoc({ layers: [{ kind: 'symbol', symbol: 'oak', x: 10, y: 20, slot: { shield: 'ghost', field: 1 } }] })!;
    const s = doc.layers[0];
    expect(s.kind === 'symbol' && s.slot).toBeUndefined();
  });

  test('повторяющиеся идентификаторы переписываются', () => {
    const doc = parseDoc({ layers: [{ kind: 'ornament', ornament: 'laurel', id: 'a' }, { kind: 'ornament', ornament: 'crown', id: 'a' }] })!;
    expect(new Set(doc.layers.map((l) => l.id)).size).toBe(2);
  });
});

describe('редактор: история и слои', () => {
  beforeEach(() => openDoc(emptyDoc()));

  test('отмена и повтор', () => {
    addSymbol('lion');
    addSymbol('oak');
    expect(getState().doc.layers).toHaveLength(2);
    undo();
    expect(getState().doc.layers).toHaveLength(1);
    redo();
    expect(getState().doc.layers).toHaveLength(2);
    undo();
    undo();
    undo(); // лишняя отмена ничего не ломает
    expect(getState().doc.layers).toHaveLength(0);
  });

  test('одинаковый ключ сливается в один шаг отмены', () => {
    addSymbol('lion');
    const id = getState().doc.layers[0].id;
    for (let i = 1; i <= 5; i++) updateLayer(id, { x: i * 10 }, 'drag-test');
    undo();
    expect(getState().doc.layers).toHaveLength(1); // отменилось только перетаскивание целиком
    expect(getState().doc.layers[0].x).not.toBe(50);
  });

  test('новая правка после отмены очищает «повторить»', () => {
    addSymbol('lion');
    undo();
    addSymbol('oak');
    expect(getState().future).toHaveLength(0);
  });

  test('первый щит включает привязку, символы занимают свободные поля по очереди', () => {
    commit((d) => ({ ...d, snap: true, layers: [makeShield('heater', 'pale')] }));
    addSymbol('lion');
    addSymbol('oak');
    addSymbol('house');
    const syms = getState().doc.layers.filter((l) => l.kind === 'symbol');
    expect(syms.map((s) => (s.kind === 'symbol' ? s.slot?.field : -1))).toEqual([0, 1, undefined]);
  });

  test('удаление щита не уничтожает привязанные символы', () => {
    const sh = makeShield('heater', 'whole');
    commit((d) => ({ ...d, snap: true, layers: [sh, makeSymbol('lion', 0, 0, { slot: { shield: sh.id, field: 0 } })] }));
    deleteLayer(sh.id);
    const [l] = getState().doc.layers;
    expect(l.kind === 'symbol' && l.slot).toBeUndefined();
    expect(l.x).toBeCloseTo(500, 0);
  });

  test('копия, порядок слоёв', () => {
    commit((d) => ({ ...d, layers: [makeOrnament('crown'), makeOrnament('stars')] }));
    const [a, b] = getState().doc.layers;
    moveLayer(a.id, 1);
    expect(getState().doc.layers.map((l) => l.id)).toEqual([b.id, a.id]);
    moveLayer(a.id, 1); // уже сверху
    expect(getState().doc.layers[1].id).toBe(a.id);
    duplicateLayer(a.id);
    expect(getState().doc.layers).toHaveLength(3);
    expect(new Set(getState().doc.layers.map((l) => l.id)).size).toBe(3);
  });

  test('смена деления подгоняет число полей щита', () => {
    const sh = makeShield('heater', 'whole');
    commit((d) => ({ ...d, layers: [sh] }));
    updateLayer(sh.id, { division: 'quarterly' });
    const now = getState().doc.layers[0];
    expect(now.kind === 'shield' && now.fields.length).toBe(4);
    updateLayer(sh.id, { division: 'pale' });
    expect((getState().doc.layers[0] as typeof sh).fields.length).toBe(2);
  });
});
