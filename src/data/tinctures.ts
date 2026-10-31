export interface Tincture {
  hex: string;
  name: string;
  meaning: string;
}

// Семь классических геральдических цветов плюс несколько нейтральных для контраста.
export const TINCTURES: Tincture[] = [
  { hex: '#e0b44c', name: 'Золото', meaning: 'щедрость, ценность, тепло, то, что хочется сберечь' },
  { hex: '#e9e6df', name: 'Серебро', meaning: 'чистота, ясность, мир, спокойное достоинство' },
  { hex: '#b3282d', name: 'Червлень', meaning: 'смелость, любовь, жизненная сила, страсть' },
  { hex: '#2c5aa0', name: 'Лазурь', meaning: 'верность, доверие, глубина, небо и вода' },
  { hex: '#2f7a4a', name: 'Зелень', meaning: 'рост, надежда, природа, обновление' },
  { hex: '#23232b', name: 'Чернь', meaning: 'стойкость, память, серьёзность, глубина' },
  { hex: '#6b3a86', name: 'Пурпур', meaning: 'достоинство, творчество, духовность' },
  { hex: '#d9702b', name: 'Оранжевый', meaning: 'энергия, радость, общение' },
  { hex: '#8a5a37', name: 'Коричневый', meaning: 'земля, основательность, корни' },
  { hex: '#e8a0b4', name: 'Розовый', meaning: 'нежность, забота, чуткость' },
  { hex: '#3aa6b5', name: 'Бирюзовый', meaning: 'свежесть, открытость, ясное общение' },
  { hex: '#8a8f99', name: 'Серый', meaning: 'нейтральность, спокойствие, сдержанность' },
];

export const TINCTURE_BY_HEX: Record<string, Tincture> = Object.fromEntries(
  TINCTURES.map((t) => [t.hex.toLowerCase(), t]),
);

export const DEFAULT_INK = '#e0b44c';
export const DEFAULT_FIELD = '#2c5aa0';
export const OUTLINE_DEFAULT = '#1c1c24';
