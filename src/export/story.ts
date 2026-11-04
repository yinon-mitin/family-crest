import type { CrestDoc, Layer, ShieldLayer, SymbolLayer } from '../model/types.ts';
import { CANVAS_H, CANVAS_W } from '../model/types.ts';
import { getSymbolPath } from '../data/symbols.ts';
import { divisionName, ornamentMeaning, ornamentName, patternName, shapeName, symbolInfo, tinctureByHex } from '../i18n/data.ts';
import { t } from '../i18n/index.ts';
import { measure, textPath } from '../render/fonts.ts';
import { attribution, renderBody } from '../render/renderCrest.ts';

// Страницы PDF строятся как SVG, где весь текст переведён в контуры: так буквы выглядят одинаково везде.
// Размеры в пунктах (A4).
export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
const M = 54;
const BOTTOM = PAGE_H - 62;
const INK = '#23232b';
const SOFT = '#5a5a66';

type Face = { font: 'serif' | 'display'; bold: boolean };
const BODY: Face = { font: 'serif', bold: false };
const BODY_B: Face = { font: 'serif', bold: true };
const TITLE: Face = { font: 'display', bold: true };

function wrap(text: string, face: Face, size: number, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next, face.font, face.bold, size) > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  private bodies: string[] = [''];
  y = M;
  constructor(private readonly footer: (n: number) => string) {}
  newPage(): void {
    this.bodies.push('');
    this.y = M;
  }
  add(svg: string): void {
    this.bodies[this.bodies.length - 1] += svg;
  }
  /** Если блок высотой h не помещается, начинает новую страницу. */
  need(h: number): void {
    if (this.y + h > BOTTOM) this.newPage();
  }
  line(text: string, face: Face, size: number, x: number, color = INK, advance = size * 1.4): void {
    this.add(`<g fill="${color}">${textPath(text, face.font, face.bold, size, x, this.y + size)}</g>`);
    this.y += advance;
  }
  paragraph(text: string, face: Face, size: number, x: number, maxW: number, color = INK): void {
    for (const l of wrap(text, face, size, maxW)) {
      this.need(size * 1.4);
      this.line(l, face, size, x, color);
    }
  }
  finish(): string[] {
    return this.bodies.map(
      (body, i) =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" width="${PAGE_W}" height="${PAGE_H}"><rect width="${PAGE_W}" height="${PAGE_H}" fill="#ffffff"/>${body}${this.footer(i + 1)}</svg>`,
    );
  }
}

const hexName = (hex: string): string => {
  const tincture = tinctureByHex(hex);
  return tincture ? `${tincture.name} — ${tincture.meaning}` : hex.toUpperCase();
};

function symbolIcon(l: SymbolLayer, x: number, y: number, size: number): string {
  const d = getSymbolPath(l.symbol);
  if (!d) return '';
  const halo = l.halo ? `<path d="${d}" fill="${l.halo}" stroke="${l.halo}" stroke-width="26" stroke-linejoin="round"/>` : '';
  return `<g transform="translate(${x} ${y}) scale(${size / 512})">${halo}<path d="${d}" fill="${l.color}"/></g>`;
}

function entry(w: Writer, l: Layer): void {
  const textX = M + 52;
  const maxW = PAGE_W - M - textX;
  const note = l.note.trim();
  let title = '';
  let meaning = '';
  const extra: string[] = [];
  let icon = '';
  switch (l.kind) {
    case 'shield': {
      const s = l as ShieldLayer;
      title = t('story.shield', { shape: shapeName(s.shape).toLowerCase() });
      meaning = t('story.division', { division: divisionName(s.division).toLowerCase() });
      s.fields.forEach((f, i) => {
        const pat = f.pattern ? t('story.pattern', { pattern: patternName(f.pattern).toLowerCase() }) : '';
        extra.push(`${s.fields.length > 1 ? t('story.field', { n: i + 1 }) : t('story.fieldColor')}: ${hexName(f.color)}${pat}`);
      });
      break;
    }
    case 'symbol': {
      const e = symbolInfo(l.symbol);
      title = e?.name ?? t('layer.symbol');
      meaning = e ? t('meaning.prefix', { text: e.meaning }) : '';
      extra.push(t('story.color', { color: hexName(l.color) }));
      break;
    }
    case 'ornament': {
      title = ornamentName(l.ornament);
      meaning = t('meaning.prefix', { text: ornamentMeaning(l.ornament) });
      break;
    }
    case 'text':
      title = t('story.text', { text: l.text });
      break;
  }
  const size = 10.5;
  const blocks: [string, Face, number, string][] = [];
  if (meaning) blocks.push([meaning, BODY, size, SOFT]);
  for (const e of extra) blocks.push([e, BODY, size, SOFT]);
  if (note) blocks.push([t('story.inMyWords', { note }), BODY_B, 11, INK]);
  const lines = blocks.reduce((n, b) => n + wrap(b[0], b[1], b[2], maxW).length, 0);
  w.need(Math.max(44, 20 + lines * 15.5) + 10);
  const top = w.y;
  if (l.kind === 'symbol') icon = symbolIcon(l, M, top, 40);
  w.add(icon);
  w.line(title, BODY_B, 13, textX, INK, 19);
  for (const [text, face, sz, color] of blocks) w.paragraph(text, face, sz, textX, maxW, color);
  w.y = Math.max(w.y, top + 44) + 12;
}

export function buildPages(doc: CrestDoc, withStory: boolean): string[] {
  const footer = (n: number): string =>
    n === 1
      ? ''
      : `<g fill="${SOFT}">${textPath(`— ${n} —`, 'serif', false, 9, PAGE_W / 2 - 12, PAGE_H - 36)}</g>`;
  const w = new Writer(footer);

  // страница 1: герб
  const name = doc.family.trim();
  const heading = name ? t('story.heading', { name }) : t('story.headingAnon');
  const hs = 34;
  const hw = measure(heading, 'display', true, hs);
  const scale = Math.min(1, (PAGE_W - 2 * M) / hw);
  w.add(`<g fill="${INK}">${textPath(heading, 'display', true, hs * scale, (PAGE_W - hw * scale) / 2, 56)}</g>`);
  const cw = PAGE_W - 2 * M - 30;
  const k = cw / CANVAS_W;
  const top = 80 + Math.max(0, (PAGE_H - 80 - 70 - cw * (CANVAS_H / CANVAS_W)) / 2.4);
  w.add(`<g transform="translate(${(PAGE_W - cw) / 2} ${top}) scale(${k})">${renderBody(doc, { prefix: 'pdf' })}</g>`);
  const attr = wrap(attribution(), BODY, 7.5, PAGE_W - 2 * M);
  attr.forEach((line, i) => w.add(`<g fill="${SOFT}">${textPath(line, 'serif', false, 7.5, M, PAGE_H - 44 + i * 10)}</g>`));

  if (withStory) {
    w.newPage();
    w.line(t('story.title'), TITLE, 28, M, INK, 38);
    w.paragraph(t('story.intro'), BODY, 11, M, PAGE_W - 2 * M, SOFT);
    w.y += 10;
    const order: Layer['kind'][] = ['shield', 'symbol', 'ornament', 'text'];
    const layers = doc.layers.filter((l) => !l.hidden);
    for (const kind of order) for (const l of layers.filter((x) => x.kind === kind)) entry(w, l);
  }
  return w.finish();
}
