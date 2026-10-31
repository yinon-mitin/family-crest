// Контуры значков (viewBox 0 0 512 512) загружаются отдельным файлом, чтобы первый экран открывался быстро.
let paths: Record<string, string> = {};

export const getSymbolPath = (id: string): string | undefined => paths[id];
export const hasSymbol = (id: string): boolean => id in paths;
export const setSymbols = (data: Record<string, string>): void => {
  paths = data;
};
export const symbolsLoaded = (): boolean => Object.keys(paths).length > 0;

export async function loadSymbols(): Promise<void> {
  if (symbolsLoaded()) return;
  const mod = await import('./symbols.json');
  setSymbols(mod.default as Record<string, string>);
}
