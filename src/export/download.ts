import type { CrestDoc } from '../model/types.ts';

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function fileName(doc: CrestDoc, ext: string, suffix = ''): string {
  const slug = doc.family
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `gerb-${slug || 'semi'}${suffix}.${ext}`;
}
