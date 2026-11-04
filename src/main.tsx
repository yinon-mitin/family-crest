import { render } from 'preact';
import '@fontsource/cormorant/cyrillic-700.css';
import '@fontsource/cormorant/latin-700.css';
import './ui/styles.css';
import { loadSymbols } from './data/symbols.ts';
import { applyDocumentLang, t } from './i18n/index.ts';
import { loadFontsBrowser } from './render/fonts.ts';
import { App } from './ui/App.tsx';

async function main() {
  const root = document.getElementById('app')!;
  applyDocumentLang();
  root.textContent = t('app.loading');
  try {
    await Promise.all([loadFontsBrowser(), loadSymbols()]);
  } catch (e) {
    root.textContent = t('app.loadFailed');
    console.error(e);
    return;
  }
  root.textContent = '';
  render(<App />, root);
}

void main();
