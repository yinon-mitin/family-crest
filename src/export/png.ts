import type { CrestDoc } from '../model/types.ts';
import { t } from '../i18n/index.ts';
import { CANVAS_H, CANVAS_W } from '../model/types.ts';
import { renderCrest } from '../render/renderCrest.ts';
import { backgroundColor, type Background } from './svg.ts';

export async function exportPng(doc: CrestDoc, width: number, bg: Background): Promise<Blob> {
  const height = Math.round((width * CANVAS_H) / CANVAS_W);
  const svg = renderCrest(doc, { width, background: backgroundColor(doc, bg) });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(t('export.pngCanvas'));
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t('export.pngBlob')))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
