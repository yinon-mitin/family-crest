export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function shade(hex: string, amount: number): string {
  const v = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const c = (v >> shift) & 255;
    const t = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.max(0, Math.min(255, Math.round(t)));
  };
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
}

/** Светлый или тёмный цвет, который читается на заданном фоне. */
export function contrast(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return lum > 0.6 ? '#1c1c24' : '#f6f1e4';
}
