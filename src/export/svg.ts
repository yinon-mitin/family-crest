import type { CrestDoc } from '../model/types.ts';
import { renderCrest } from '../render/renderCrest.ts';

export type Background = 'transparent' | 'white' | 'canvas';

export const backgroundColor = (doc: CrestDoc, bg: Background): string | null =>
  bg === 'white' ? '#ffffff' : bg === 'canvas' ? doc.background : null;

export function exportSvg(doc: CrestDoc, bg: Background): Blob {
  const svg = renderCrest(doc, { attribution: true, width: 1000, background: backgroundColor(doc, bg) });
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], { type: 'image/svg+xml' });
}
