import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { loadAll } from './helpers.ts';
import { CATALOG } from '../src/data/catalog.ts';
import { PROMPTS } from '../src/data/prompts.ts';
import { TINCTURES } from '../src/data/tinctures.ts';
import { ru } from '../src/i18n/ru.ts';
import { en } from '../src/i18n/en.ts';
import { EN_CATEGORIES, EN_DIVISIONS, EN_ORNAMENTS, EN_PATTERNS, EN_PROMPTS, EN_SHAPES, EN_SYMBOLS, EN_TINCTURES } from '../src/i18n/dataEn.ts';
import { getLang, setLang, t } from '../src/i18n/index.ts';
import { categoryTitle, divisionName, ornamentName, patternName, prompts, shapeName, symbolCatalog, symbolInfo, tinctureByHex } from '../src/i18n/data.ts';
import { TEMPLATES } from '../src/model/templates.ts';
import { emptyDoc, makeOrnament, makeShield, makeSymbol, makeText } from '../src/model/doc.ts';
import { renderCrest } from '../src/render/renderCrest.ts';
import { buildPages } from '../src/export/story.ts';
import { fileName } from '../src/export/download.ts';
import { layerTitle } from '../src/ui/names.ts';
import { textForms } from '../src/data/names.ts';
import type { TabId } from '../src/model/store.ts';

beforeAll(loadAll);
afterEach(() => setLang('ru'));

const CYRILLIC = /[А-Яа-яЁё]/;
const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('словари интерфейса', () => {
  test('в английском те же ключи и подстановки, что и в русском', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ru[key]));
      expect(en[key].trim().length, key).toBeGreaterThan(0);
    }
  });

  test('в английских строках нет кириллицы', () => {
    for (const [key, text] of Object.entries(en)) expect(text, key).not.toMatch(CYRILLIC);
  });

  test('t() подставляет значения и следует выбранному языку', () => {
    expect(getLang()).toBe('ru');
    expect(t('shield.which', { n: 2, total: 3 })).toContain('2 из 3');
    setLang('en');
    expect(getLang()).toBe('en');
    expect(t('shield.which', { n: 2, total: 3 })).toContain('2 of 3');
    expect(t('app.title')).toBe('Family crest');
  });
});

describe('данные на английском', () => {
  test('переведён каждый символ каталога и нет лишних', () => {
    expect(Object.keys(EN_SYMBOLS).sort()).toEqual([...new Set(CATALOG.map((e) => e.icon))].sort());
    for (const [icon, [name, meaning]] of Object.entries(EN_SYMBOLS)) {
      expect(name.length, icon).toBeGreaterThan(1);
      expect(meaning.length, icon).toBeGreaterThan(5);
      expect(name + meaning, icon).not.toMatch(CYRILLIC);
    }
  });

  test('цвета, орнаменты, формы, деления, узоры, вопросы и категории переведены', () => {
    expect(Object.keys(EN_TINCTURES).sort()).toEqual(TINCTURES.map((c) => c.hex).sort());
    const all = [
      ...Object.values(EN_TINCTURES).flat(),
      ...Object.values(EN_ORNAMENTS).flat(),
      ...Object.values(EN_SHAPES),
      ...Object.values(EN_DIVISIONS),
      ...Object.values(EN_PATTERNS),
      ...Object.values(EN_CATEGORIES),
      ...Object.values(EN_PROMPTS).flat(),
    ];
    for (const s of all) {
      expect(s.length).toBeGreaterThan(1);
      expect(s).not.toMatch(CYRILLIC);
    }
    for (const tab of Object.keys(PROMPTS) as TabId[]) expect(EN_PROMPTS[tab].length, tab).toBe(PROMPTS[tab].length);
  });

  test('шаблоны на английском: названия, описания и надписи', () => {
    setLang('en');
    for (const tpl of TEMPLATES) {
      expect(tpl.name.en + tpl.description.en, tpl.id).not.toMatch(CYRILLIC);
      for (const l of tpl.make().layers) if (l.kind === 'text') expect(l.text, tpl.id).not.toMatch(CYRILLIC);
    }
    setLang('ru');
    for (const tpl of TEMPLATES) for (const l of tpl.make().layers) if (l.kind === 'text') expect(l.text, tpl.id).toMatch(CYRILLIC);
  });
});

describe('доступ к данным на текущем языке', () => {
  test('русский остаётся языком по умолчанию', () => {
    expect(symbolInfo('lion')?.name).toBe('Лев');
    expect(categoryTitle('work')).toBe('Рабочие сферы');
    expect(shapeName('heater')).toBe('Классический');
  });

  test('английские названия подставляются везде', () => {
    setLang('en');
    expect(symbolInfo('lion')?.name).toBe('Lion');
    expect(symbolCatalog().length).toBe(CATALOG.length);
    expect(categoryTitle('animal')).toBe('Animals');
    expect(tinctureByHex('#E0B44C')?.name).toBe('Gold');
    expect(ornamentName('laurel')).toBe('Laurel wreath');
    expect(shapeName('round')).toBe('Round');
    expect(divisionName('pall')).toContain('Pall');
    expect(patternName('ermine')).toBe('Ermine');
    expect(prompts('text').length).toBe(3);
    expect(textForms().map((f) => f.name)).toContain('On a banner');
    expect(layerTitle(makeSymbol('wolf-head', 0, 0))).toBe('Wolf');
    expect(layerTitle(makeShield('oval'))).toBe('Shield: oval');
    expect(layerTitle(makeText(''))).toBe('Empty caption');
  });

  test('язык не меняет сам герб: отрисовка одинакова', () => {
    const doc = TEMPLATES[0].make();
    const ruSvg = renderCrest(doc);
    setLang('en');
    expect(renderCrest(doc)).toBe(ruSvg);
  });

  test('SVG подписывается на выбранном языке', () => {
    const doc = { ...emptyDoc(), family: 'Ivanov', layers: [makeOrnament('crown')] };
    expect(renderCrest(doc, { attribution: true })).toContain('Герб семьи Ivanov');
    setLang('en');
    const svg = renderCrest(doc, { attribution: true });
    expect(svg).toContain('The Ivanov family crest');
    expect(svg).toContain('Icons: game-icons.net');
    expect(svg).not.toMatch(CYRILLIC);
  });

  test('имена файлов и рассказ о гербе зависят от языка', () => {
    const doc = { ...TEMPLATES[1].make(), family: 'Ivanov' };
    expect(fileName(doc, 'png', '-2048')).toBe('gerb-Ivanov-2048.png');
    const ruPages = buildPages(doc, true);
    setLang('en');
    expect(fileName(doc, 'png', '-2048')).toBe('family-crest-Ivanov-2048.png');
    expect(fileName({ ...doc, family: '' }, 'json', t('file.projectSuffix'))).toBe('family-crest-family-project.json');
    const enPages = buildPages(doc, true);
    expect(enPages.length).toBeGreaterThanOrEqual(2);
    expect(enPages.join('')).not.toBe(ruPages.join(''));
  });
});
