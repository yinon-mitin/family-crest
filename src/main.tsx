import { render } from 'preact';
import '@fontsource/cormorant/cyrillic-700.css';
import '@fontsource/cormorant/latin-700.css';
import './ui/styles.css';
import { loadSymbols } from './data/symbols.ts';
import { loadFontsBrowser } from './render/fonts.ts';
import { App } from './ui/App.tsx';

async function main() {
  const root = document.getElementById('app')!;
  root.textContent = 'Загрузка…';
  try {
    await Promise.all([loadFontsBrowser(), loadSymbols()]);
  } catch (e) {
    root.textContent = 'Не удалось загрузить ресурсы сайта. Проверьте соединение и обновите страницу.';
    console.error(e);
    return;
  }
  root.textContent = '';
  render(<App />, root);
}

void main();
