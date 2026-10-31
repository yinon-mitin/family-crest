import { parse, type Font, type PathCommand } from 'opentype.js';
import type { FontId } from '../model/types.ts';

// Текст герба переводится в контуры: тогда он выглядит одинаково в браузере, PNG, SVG и PDF.
// Каждый шрифт состоит из двух файлов (кириллица и латиница), буквы берутся из первого, где они есть.

type Key = `${FontId}-${'regular' | 'bold'}`;
const registry = new Map<Key, Font[]>();

export const FONT_NAMES: Record<FontId, string> = {
  serif: 'PT Serif',
  display: 'Cormorant',
};

const keyOf = (font: FontId, bold: boolean): Key => `${font}-${bold ? 'bold' : 'regular'}`;

export function registerFont(font: FontId, bold: boolean, buffers: ArrayBuffer[]): void {
  registry.set(keyOf(font, bold), buffers.map((b) => parse(b)));
}

export const fontsReady = (): boolean => registry.size >= 4;

export interface Glyphs {
  glyphs: { d: string; adv: number }[];
  width: number;
  /** Символы, которых нет в шрифте. Они пропускаются. */
  missing: string[];
}

// toPathData из opentype.js 2.0 иногда склеивает числа («27.70»), поэтому контур собирается здесь.
const r1 = (v: number | undefined): string => String(Math.round((v ?? 0) * 10) / 10);
function pathData(cmds: PathCommand[]): string {
  let d = '';
  for (const c of cmds) {
    if (c.type === 'Z') d += 'Z';
    else if (c.type === 'C') d += `C${r1(c.x1)} ${r1(c.y1)} ${r1(c.x2)} ${r1(c.y2)} ${r1(c.x)} ${r1(c.y)}`;
    else if (c.type === 'Q') d += `Q${r1(c.x1)} ${r1(c.y1)} ${r1(c.x)} ${r1(c.y)}`;
    else d += `${c.type}${r1(c.x)} ${r1(c.y)}`;
  }
  return d;
}

const glyphCache = new Map<string, { d: string; adv: number } | null>();

function glyphFor(ch: string, font: FontId, bold: boolean): { d: string; adv: number } | null {
  const k = `${keyOf(font, bold)}|${ch}`;
  if (glyphCache.has(k)) return glyphCache.get(k)!;
  let found: { d: string; adv: number } | null = null;
  for (const f of registry.get(keyOf(font, bold)) ?? []) {
    if (f.charToGlyphIndex(ch) > 0) {
      const g = f.charToGlyph(ch);
      found = {
        d: pathData(g.getPath(0, 0, SIZE).commands),
        adv: ((g.advanceWidth ?? f.unitsPerEm * 0.5) * SIZE) / f.unitsPerEm,
      };
      break;
    }
  }
  glyphCache.set(k, found);
  return found;
}

/** Базовый кегль, в котором строятся контуры; слой масштабирует его. */
export const SIZE = 100;

const layoutCache = new Map<string, Glyphs>();

export function layoutText(text: string, font: FontId, bold: boolean): Glyphs {
  const k = `${keyOf(font, bold)}|${text}`;
  const hit = layoutCache.get(k);
  if (hit) return hit;
  const out: Glyphs = { glyphs: [], width: 0, missing: [] };
  for (const ch of Array.from(text)) {
    if (ch === '\n') continue;
    const g = glyphFor(ch, font, bold);
    if (!g) {
      if (!out.missing.includes(ch)) out.missing.push(ch);
      continue;
    }
    out.glyphs.push(g);
    out.width += g.adv;
  }
  if (layoutCache.size > 400) layoutCache.clear();
  layoutCache.set(k, out);
  return out;
}

/** Ширина строки при кегле `size`; нужна PDF-рассказу для переноса строк. */
export const measure = (text: string, font: FontId, bold: boolean, size: number): number =>
  (layoutText(text, font, bold).width * size) / SIZE;

/** Путь строки (контуры) с началом в (x, y) и кеглем `size`. */
export function textPath(text: string, font: FontId, bold: boolean, size: number, x: number, y: number): string {
  const { glyphs } = layoutText(text, font, bold);
  const k = size / SIZE;
  let pen = 0;
  let out = '';
  for (const g of glyphs) {
    if (g.d) out += `<path transform="translate(${Math.round((x + pen * k) * 100) / 100} ${y}) scale(${k})" d="${g.d}"/>`;
    pen += g.adv;
  }
  return out;
}

const fontFiles = import.meta.glob('/node_modules/@fontsource/{pt-serif,cormorant}/files/*-{cyrillic,latin}-{400,700}-normal.woff', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Загрузка шрифтов в браузере. Файлы лежат на том же сайте, внешних запросов нет. */
export async function loadFontsBrowser(): Promise<void> {
  if (fontsReady()) return;
  const jobs: Promise<void>[] = [];
  for (const [id, prefix] of [['serif', 'pt-serif'], ['display', 'cormorant']] as const) {
    for (const [bold, weight] of [[false, 400], [true, 700]] as const) {
      const urls = ['cyrillic', 'latin'].map((subset) => {
        const hit = Object.entries(fontFiles).find(([p]) => p.endsWith(`/${prefix}-${subset}-${weight}-normal.woff`));
        if (!hit) throw new Error(`Нет файла шрифта ${prefix} ${subset} ${weight}`);
        return hit[1];
      });
      jobs.push(
        Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer()))).then((bufs) => registerFont(id, bold, bufs)),
      );
    }
  }
  await Promise.all(jobs);
}
