import type { CrestDoc, Layer, OrnamentLayer, ShieldLayer, SymbolLayer, TextLayer } from '../model/types.ts';
import { CANVAS_H, CANVAS_W } from '../model/types.ts';
import { resolveSymbol, slotShield } from '../model/doc.ts';
import { getSymbolPath } from '../data/symbols.ts';
import { fontsReady } from './fonts.ts';
import { t } from '../i18n/index.ts';
import { n } from './geometry.ts';
import { ORNAMENTS } from './ornaments.ts';
import { patternGeometry } from './patterns.ts';
import { SHAPES, shieldFields } from './shields.ts';
import { renderTextBody, textBox } from './text.ts';

export interface RenderOptions {
  /** Редактор: у слоёв есть data-id и невидимые области для попадания курсором. */
  editor?: boolean;
  /** Префикс идентификаторов clipPath: нужен, когда на странице несколько гербов. */
  prefix?: string;
  /** Цвет подложки; null — прозрачный фон. По умолчанию берётся из документа. */
  background?: string | null;
  /** Размер в пикселях для атрибутов width и height. */
  width?: number;
  attribution?: boolean;
}

/** Указание авторства значков на текущем языке. */
export const attribution = (): string => t('story.attribution');

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const tf = (x: number, y: number, rot: number, sx: number, sy: number): string =>
  `translate(${n(x)} ${n(y)})${rot ? ` rotate(${n(rot)})` : ''} scale(${n(sx)} ${n(sy)})`;

function renderShield(l: ShieldLayer, prefix: string): string {
  const shape = SHAPES[l.shape];
  const fields = shieldFields(l.shape, l.division);
  const cid = `${prefix}${l.id}`;
  let defs = `<clipPath id="${cid}s"><path d="${shape.d}"/></clipPath>`;
  let body = '';
  fields.forEach((f, i) => {
    const st = l.fields[i] ?? l.fields[l.fields.length - 1];
    defs += `<clipPath id="${cid}f${i}"><path d="${f.d}"/></clipPath>`;
    let inner = `<path d="${f.d}" fill="${st.color}"/>`;
    if (st.pattern) {
      const g = patternGeometry(st.pattern);
      inner += g.stroke
        ? `<path d="${g.d}" fill="none" stroke="${st.patternColor}" stroke-width="${g.stroke}" stroke-linecap="round"/>`
        : `<path d="${g.d}" fill="${st.patternColor}"/>`;
    }
    body += `<g clip-path="url(#${cid}f${i})">${inner}</g>`;
  });
  const w = n(l.outlineWidth);
  const lines =
    fields.length > 1
      ? `<path d="${fields.map((f) => f.d).join('')}" fill="none" stroke="${l.outline}" stroke-width="${w}" stroke-linejoin="round"/>`
      : '';
  return (
    `<defs>${defs}</defs><g clip-path="url(#${cid}s)">${body}${lines}</g>` +
    `<path d="${shape.d}" fill="none" stroke="${l.outline}" stroke-width="${w}" stroke-linejoin="round"/>`
  );
}

function renderSymbolBody(l: SymbolLayer, editor: boolean): string {
  const d = getSymbolPath(l.symbol);
  if (!d) return '';
  const halo = l.halo
    ? `<path d="${d}" fill="${l.halo}" stroke="${l.halo}" stroke-width="26" stroke-linejoin="round" stroke-linecap="round"/>`
    : '';
  const hit = editor ? '<rect width="512" height="512" fill="transparent"/>' : '';
  return `${hit}${halo}<path d="${d}" fill="${l.color}"/>`;
}

function renderOrnamentBody(l: OrnamentLayer): string {
  return ORNAMENTS[l.ornament].draw(l.color, l.color2);
}

function renderLayerSvg(l: Layer, doc: CrestDoc, prefix: string, editor: boolean): string {
  const id = editor ? ` data-id="${l.id}"` : '';
  switch (l.kind) {
    case 'shield':
      return `<g${id} transform="${tf(l.x, l.y, l.rotation, l.flipX ? -l.scale : l.scale, l.scale)}">${renderShield(l, prefix)}</g>`;
    case 'symbol': {
      const r = resolveSymbol(l, doc);
      const s = r.size / 512;
      return `<g${id} transform="${tf(r.x, r.y, r.rotation, r.flipX ? -s : s, s)} translate(-256 -256)">${renderSymbolBody(l, editor)}</g>`;
    }
    case 'ornament':
      return `<g${id} transform="${tf(l.x, l.y, l.rotation, l.flipX ? -l.scale : l.scale, l.scale)}">${renderOrnamentBody(l)}</g>`;
    case 'text': {
      let hit = '';
      if (editor) {
        const b = textBox(l);
        hit = `<rect x="${n(b.cx - b.w / 2)}" y="${n(b.cy - b.h / 2)}" width="${n(b.w)}" height="${n(b.h)}" fill="transparent"/>`;
      }
      return `<g${id} transform="${tf(l.x, l.y, l.rotation, l.flipX ? -l.scale : l.scale, l.scale)}">${hit}${renderTextBody(l as TextLayer)}</g>`;
    }
  }
}

// Слои неизменяемы, поэтому результат запоминается по объекту слоя: при перетаскивании одного слоя
// остальные не пересчитываются.
const cache = new WeakMap<Layer, { key: string; out: string }>();

function renderLayer(l: Layer, doc: CrestDoc, prefix: string, editor: boolean): string {
  let dep = `${prefix}|${editor}|${fontsReady()}`;
  if (l.kind === 'symbol' && l.slot) {
    const sh = slotShield(l, doc);
    if (sh) dep += `|${sh.shape}${sh.division}${sh.x}${sh.y}${sh.scale}${sh.rotation}${sh.flipX}`;
  }
  const hit = cache.get(l);
  if (hit && hit.key === dep) return hit.out;
  const out = renderLayerSvg(l, doc, prefix, editor);
  cache.set(l, { key: dep, out });
  return out;
}

/** Содержимое холста без внешнего <svg>: подложка и слои. */
export function renderBody(doc: CrestDoc, opts: RenderOptions = {}): string {
  const prefix = opts.prefix ?? '';
  const editor = !!opts.editor;
  const bg = opts.background === undefined ? doc.background : opts.background;
  const back = bg ? `<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${bg}"/>` : '';
  const body = doc.layers
    .filter((l) => !l.hidden)
    .map((l) => renderLayer(l, doc, prefix, editor))
    .join('');
  return back + body;
}

export function renderCrest(doc: CrestDoc, opts: RenderOptions = {}): string {
  const size = opts.width ? ` width="${n(opts.width)}" height="${n((opts.width * CANVAS_H) / CANVAS_W)}"` : '';
  const meta = opts.attribution
    ? `<title>${esc(doc.family ? t('story.heading', { name: doc.family }) : t('story.headingAnon'))}</title><metadata>${esc(attribution())}</metadata>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"${size}>${meta}${renderBody(doc, opts)}</svg>`;
}
