import type { CrestDoc, DivisionId, FieldStyle, Layer, ShapeId, SymbolLayer } from './types.ts';
import { emptyDoc, makeOrnament, makeShield, makeSymbol, makeText } from './doc.ts';

export interface Template {
  id: string;
  name: string;
  description: string;
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
    name: 'Классический щит',
    description: 'Один символ на синем поле, лавровый венок, корона и лента с девизом.',
    make: () =>
      build({
        shape: 'heater',
        division: 'whole',
        fields: [f(BLUE)],
        symbols: [['lion', GOLD]],
        behind: [makeOrnament('laurel')],
        extra: () => [makeOrnament('crown'), makeText('Наш девиз', { y: 1030 })],
      }),
  },
  {
    id: 'quarters',
    name: 'Четыре опоры',
    description: 'Четыре поля: профессия, сила, корни и дом. Каждое можно заменить на своё.',
    make: () =>
      build({
        shape: 'heater',
        division: 'quarterly',
        fields: [f(BLUE), f(SILVER), f(GREEN), f(RED)],
        symbols: [['open-book', GOLD], ['lion', BLUE], ['oak', GOLD], ['house', GOLD]],
        extra: () => [makeOrnament('stars'), makeText('Наши опоры', { y: 1040, bannerColor: BLUE })],
      }),
  },
  {
    id: 'two-lines',
    name: 'Две линии рода',
    description: 'Щит делится на две половины: каждая линия семьи получает своё поле.',
    make: () => {
      const doc = build({
        shape: 'french',
        division: 'pale',
        fields: [f(GOLD), f(BLUE)],
        symbols: [['oak', GREEN], ['wolf-head', GOLD]],
        behind: [makeOrnament('olive')],
        extra: () => [makeText('Наши корни', { y: 1030, bannerColor: GREEN })],
      });
      doc.layers.push(makeSymbol('hearts', 500, 560, { color: RED, scale: 0.7 }));
      return doc;
    },
  },
  {
    id: 'medallion',
    name: 'Медальон',
    description: 'Круглый щит в двойном кольце. Надписи идут по кругу.',
    make: () =>
      build({
        shape: 'round',
        division: 'whole',
        fields: [f(GREEN, 'dots', '#3f9a5f')],
        symbols: [['sun', GOLD]],
        behind: [makeOrnament('ringDouble', { scale: 0.88 })],
        extra: () => [
          makeText('Семья', { form: 'arcUp', y: 220, radius: 372, color: '#7d1a1f', scale: 0.62 }),
          makeText('вместе', { form: 'arcDown', y: 980, radius: 372, color: '#7d1a1f', scale: 0.62 }),
        ],
      }),
  },
  {
    id: 'tree',
    name: 'Дерево рода',
    description: 'Корни, ствол и крона на тёмном круглом поле: поколения одного дерева.',
    make: () =>
      build({
        shape: 'round',
        division: 'whole',
        fields: [f('#22304f')],
        symbols: [],
        behind: [makeOrnament('rays', { scale: 0.62, color: '#f0d9a0' })],
        extra: () => [
          makeOrnament('tree', { scale: 0.72, color: '#8a5a37', color2: '#6fb36f' }),
          makeText('Корни и ветви', { y: 1030, bannerColor: '#7a4a2a' }),
        ],
      }),
  },
  {
    id: 'sun-sea',
    name: 'Небо и море',
    description: 'Верхнее поле для того, что над нами, нижнее для того, что нас несёт.',
    make: () =>
      build({
        shape: 'french',
        division: 'fess',
        fields: [f('#3aa6b5'), f(BLUE, 'waves', '#d8ecf2')],
        symbols: [['sun', GOLD], ['anchor', SILVER]],
        extra: () => [makeText('Свой курс', { y: 1030, bannerColor: '#164a7a' })],
      }),
  },
  {
    id: 'generations',
    name: 'Три поколения',
    description: 'Три пояса: прошлое, настоящее и будущее семьи.',
    make: () =>
      build({
        shape: 'notched',
        division: 'fess3',
        fields: [f(GOLD), f(SILVER), f(BLUE)],
        symbols: [['tree-roots', '#6b4a2b'], ['house', RED], ['sprout', GREEN]],
        behind: [makeOrnament('frame', { scale: 0.92 })],
        extra: () => [makeText('Три поколения', { y: 1090, bannerColor: BLACK, scale: 0.55 })],
      }),
  },
  {
    id: 'path',
    name: 'Наш путь',
    description: 'Диагональное деление: то, что позади, и то, что впереди.',
    make: () =>
      build({
        shape: 'kite',
        division: 'bend',
        fields: [f(GREEN), f(GOLD, 'chevrons', '#e9c978')],
        symbols: [['mountains', SILVER], ['road', RED]],
        extra: () => [makeOrnament('flourish', { y: 1010 }), makeText('Шаг за шагом', { y: 1120, bannerColor: RED, scale: 0.5 })],
      }),
  },
];

export const blankDoc = (): CrestDoc => emptyDoc();
