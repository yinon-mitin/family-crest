import { LANGS, getLang, setLang, t, type Lang } from '../i18n/index.ts';

const LABELS: Record<Lang, { short: string; name: string }> = {
  ru: { short: 'RU', name: 'Русский' },
  en: { short: 'EN', name: 'English' },
};

export function LangSwitch({ class: cls = '' }: { class?: string }) {
  const current = getLang();
  return (
    <div class={`lang-switch ${cls}`} role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} class={l === current ? 'on' : ''} aria-pressed={l === current} title={LABELS[l].name} aria-label={LABELS[l].name} onClick={() => setLang(l)}>
          {LABELS[l].short}
        </button>
      ))}
    </div>
  );
}
