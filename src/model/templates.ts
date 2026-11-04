import type { CrestDoc, DivisionId, FieldStyle, Layer, ShapeId, SymbolLayer } from './types.ts';
import { emptyDoc, makeOrnament, makeShield, makeSymbol, makeText } from './doc.ts';
import { tx, type Pair } from '../i18n/index.ts';

export interface Template {
  id: string;
  name: Pair;
  description: Pair;
  /** Надписи создаются на текущем языке интерфейса. */
  make(): CrestDoc;
}

const GOLD = '#e0b44c';
const SILVER = '#e9e6df';
const RED = '#b3282d';
const BLUE = '#2c5aa0';
const GREEN = '#2f7a4a';
const BLACK = '#23232b';

const f = (color: string, pattern: FieldStyle['pattern'] = null, patternColor = '#ffffff'): FieldStyle => ({ color, pattern, patternColor });

interface Spec {
  shape: ShapeId;
  division: DivisionId;
  fields: FieldStyle[];
  symbols: [icon: string, color: string][];
  extra?: (shieldId: string) => Layer[];
  behind?: Layer[];
}

function build(spec: Spec): CrestDoc {
  const doc = emptyDoc();
  doc.snap = true;
  const shield = makeShield(spec.shape, spec.division, { fields: spec.fields });
  const symbols: SymbolLayer[] = spec.symbols.map(([icon, color], i) =>
    makeSymbol(icon, 0, 0, { color, slot: { shield: shield.id, field: i } }),
  );
  doc.layers = [...(spec.behind ?? []), shield, ...symbols, ...(spec.extra?.(shield.id) ?? [])];
  return doc;
}

export const TEMPLATES: Template[] = [
  {
    id: 'classic',
    name: { ru: 'Классический щит', en: 'Classic shield' },
    description: {
      ru: 'Один символ на синем поле, лавровый венок, корона и лента с девизом.',
      en: 'One symbol on a blue field, a laurel wreath, a crown and a banner with a motto.',
    },
    make: () =>
      build({
        shape: 'heater',
        division: 'whole',
        fields: [f(BLUE)],
        symbols: [['lion', GOLD]],
        behind: [makeOrnament('laurel')],
        extra: () => [makeOrnament('crown', { y: 140, scale: 0.9 }), makeText(tx('Наш девиз', 'Our motto'), { y: 1030 })],
      }),
  },
  {
    id: 'quarters',
    name: { ru: 'Четыре опоры', en: 'Four pillars' },
    description: {
      ru: 'Четыре поля: профессия, сила, корни и дом. Каждое можно заменить на своё.',
      en: 'Four fields: profession, strength, roots and home. Each can be replaced with your own.',
    },
    make: () =>
      build({
        shape: 'heater',
        division: 'quarterly',
        fields: [f(BLUE), f(SILVER), f(GREEN), f(RED)],
        symbols: [['open-book', GOLD], ['lion', BLUE], ['oak', GOLD], ['house', GOLD]],
        extra: () => [makeOrnament('stars'), makeText(tx('Наши опоры', 'Our pillars'), { y: 1040, bannerColor: BLUE })],
      }),
  },
  {
    id: 'two-lines',
    name: { ru: 'Две линии рода', en: 'Two family lines' },
    description: {
      ru: 'Щит делится на две половины: каждая линия семьи получает своё поле.',
      en: 'The shield is split into two halves: each line of the family gets its own field.',
    },
    make: () => {
      const doc = build({
        shape: 'french',
        division: 'pale',
        fields: [f(GOLD), f(BLUE)],
        symbols: [['oak', GREEN], ['wolf-head', GOLD]],
        behind: [makeOrnament('olive')],
        extra: () => [makeText(tx('Наши корни', 'Our roots'), { y: 1030, bannerColor: GREEN })],
      });
      doc.layers.push(makeSymbol('hearts', 500, 800, { color: RED, scale: 0.55 }));
      return doc;
    },
  },
  {
    id: 'medallion',
    name: { ru: 'Медальон', en: 'Medallion' },
    description: {
      ru: 'Круглый щит в двойном кольце. Надписи идут по кругу.',
      en: 'A round shield in a double ring. The captions follow the circle.',
    },
    make: () =>
      build({
        shape: 'round',
        division: 'whole',
        fields: [f(GREEN, 'dots', '#3f9a5f')],
        symbols: [['sun', GOLD]],
        behind: [makeOrnament('ringDouble', { scale: 0.88 })],
        extra: () => [
          makeText(tx('Семья', 'Family'), { form: 'arcUp', y: 233, radius: 372, color: '#7d1a1f', scale: 0.62 }),
          makeText(tx('вместе', 'together'), { form: 'arcDown', y: 954, radius: 372, color: '#7d1a1f', scale: 0.62 }),
        ],
      }),
  },
  {
    id: 'tree',
    name: { ru: 'Дерево рода', en: 'Family tree' },
    description: {
      ru: 'Корни, ствол и крона на тёмном круглом поле: поколения одного дерева.',
      en: 'Roots, trunk and crown on a dark round field: the generations of one tree.',
    },
    make: () =>
      build({
        shape: 'round',
        division: 'whole',
        fields: [f('#22304f')],
        symbols: [],
        behind: [makeOrnament('rays', { scale: 0.62, color: '#f0d9a0' })],
        extra: () => [
          makeOrnament('tree', { scale: 0.64, color: '#8a5a37', color2: '#6fb36f' }),
          makeText(tx('Корни и ветви', 'Roots and branches'), { y: 1030, bannerColor: '#7a4a2a' }),
        ],
      }),
  },
  {
    id: 'sun-sea',
    name: { ru: 'Небо и море', en: 'Sky and sea' },
    description: {
      ru: 'Верхнее поле для того, что над нами, нижнее для того, что нас несёт.',
      en: 'The upper field for what is above us, the lower one for what carries us.',
    },
    make: () =>
      build({
        shape: 'french',
        division: 'fess',
        fields: [f('#3aa6b5'), f(BLUE, 'waves', '#d8ecf2')],
        symbols: [['sun', GOLD], ['anchor', SILVER]],
        extra: () => [makeText(tx('Свой курс', 'Our own course'), { y: 1030, bannerColor: '#164a7a' })],
      }),
  },
  {
    id: 'generations',
    name: { ru: 'Три поколения', en: 'Three generations' },
    description: {
      ru: 'Три пояса: прошлое, настоящее и будущее семьи.',
      en: 'Three bands: the past, the present and the future of the family.',
    },
    make: () =>
      build({
        shape: 'notched',
        division: 'fess3',
        fields: [f(GOLD), f(SILVER), f(BLUE)],
        symbols: [['tree-roots', '#6b4a2b'], ['house', RED], ['sprout', GREEN]],
        behind: [makeOrnament('frame', { scale: 0.92 })],
        extra: () => [makeText(tx('Три поколения', 'Three generations'), { y: 1090, bannerColor: BLACK, scale: 0.55 })],
      }),
  },
  {
    id: 'path',
    name: { ru: 'Наш путь', en: 'Our path' },
    description: {
      ru: 'Диагональное деление: то, что позади, и то, что впереди.',
      en: 'A diagonal division: what lies behind and what lies ahead.',
    },
    make: () =>
      build({
        shape: 'kite',
        division: 'bend',
        fields: [f(GREEN), f(GOLD, 'chevrons', '#e9c978')],
        symbols: [['mountains', SILVER], ['road', RED]],
        extra: () => [makeOrnament('flourish', { y: 1010 }), makeText(tx('Шаг за шагом', 'Step by step'), { y: 1120, bannerColor: RED, scale: 0.5 })],
      }),
  },
];

export const blankDoc = (): CrestDoc => emptyDoc();
