// Названия и значения на текущем языке. Русский текст хранится рядом с данными, английский — в dataEn.ts;
// если перевода нет, показывается русский.
import { BY_ICON, CATALOG, CATEGORIES, type CatalogEntry, type Category } from '../data/catalog.ts';
import { PROMPTS } from '../data/prompts.ts';
import { TINCTURES, type Tincture } from '../data/tinctures.ts';
import type { DivisionId, OrnamentId, PatternId, ShapeId } from '../model/types.ts';
import type { TabId } from '../model/store.ts';
import { ORNAMENTS } from '../render/ornaments.ts';
import { PATTERNS } from '../render/patterns.ts';
import { DIVISIONS, SHAPES } from '../render/shields.ts';
import { getLang, type Lang } from './index.ts';
import { EN_CATEGORIES, EN_DIVISIONS, EN_ORNAMENTS, EN_PATTERNS, EN_PROMPTS, EN_SHAPES, EN_SYMBOLS, EN_TINCTURES } from './dataEn.ts';

const memo = <T>(build: (lang: Lang) => T): (() => T) => {
  const cache = new Map<Lang, T>();
  return () => {
    const lang = getLang();
    if (!cache.has(lang)) cache.set(lang, build(lang));
    return cache.get(lang)!;
  };
};

const localEntry = (e: CatalogEntry, lang: Lang): CatalogEntry => {
  const en = lang === 'en' ? EN_SYMBOLS[e.icon] : undefined;
  return en ? { ...e, name: en[0], meaning: en[1] } : e;
};

const catalogMemo = memo((lang) => {
  const list = CATALOG.map((e) => localEntry(e, lang));
  return { list, byIcon: Object.fromEntries(list.map((e) => [e.icon, e])) as Record<string, CatalogEntry> };
});

/** Каталог символов с названиями и значениями на текущем языке. */
export const symbolCatalog = (): CatalogEntry[] => catalogMemo().list;
export const symbolInfo = (icon: string): CatalogEntry | undefined => catalogMemo().byIcon[icon] ?? BY_ICON[icon];

export const categoryTitle = (id: Category): string => (getLang() === 'en' ? EN_CATEGORIES[id] : CATEGORIES.find((c) => c.id === id)!.title);

const tincturesMemo = memo((lang) => {
  const list: Tincture[] = TINCTURES.map((t) => {
    const en = lang === 'en' ? EN_TINCTURES[t.hex] : undefined;
    return en ? { ...t, name: en[0], meaning: en[1] } : t;
  });
  return { list, byHex: Object.fromEntries(list.map((t) => [t.hex.toLowerCase(), t])) as Record<string, Tincture> };
});

export const tinctures = (): Tincture[] => tincturesMemo().list;
export const tinctureByHex = (hex: string): Tincture | undefined => tincturesMemo().byHex[hex.toLowerCase()];

export const ornamentName = (id: OrnamentId): string => (getLang() === 'en' ? EN_ORNAMENTS[id][0] : ORNAMENTS[id].name);
export const ornamentMeaning = (id: OrnamentId): string => (getLang() === 'en' ? EN_ORNAMENTS[id][1] : ORNAMENTS[id].meaning);
export const shapeName = (id: ShapeId): string => (getLang() === 'en' ? EN_SHAPES[id] : SHAPES[id].name);
export const divisionName = (id: DivisionId): string => (getLang() === 'en' ? EN_DIVISIONS[id] : DIVISIONS[id].name);
export const patternName = (id: PatternId): string => (getLang() === 'en' ? EN_PATTERNS[id] : PATTERNS[id].name);
export const prompts = (tab: TabId): string[] => (getLang() === 'en' ? EN_PROMPTS[tab] : PROMPTS[tab]);
