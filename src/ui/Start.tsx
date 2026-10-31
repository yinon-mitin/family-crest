import { useMemo } from 'preact/hooks';
import { emptyDoc } from '../model/doc.ts';
import { loadAuto } from '../model/serialize.ts';
import { openDoc, setState } from '../model/store.ts';
import { TEMPLATES } from '../model/templates.ts';
import { renderCrest } from '../render/renderCrest.ts';
import { About } from './About.tsx';
import { pickFile, wipe } from './files.ts';
import { useStore } from '../model/store.ts';

export function Start() {
  const dialog = useStore((s) => s.dialog);
  const saved = useMemo(() => {
    const d = loadAuto();
    return d && d.layers.length ? d : null;
  }, []);
  const cards = useMemo(() => TEMPLATES.map((t) => ({ t, svg: renderCrest(t.make(), { prefix: `t-${t.id}-` }) })), []);
  const savedSvg = useMemo(() => (saved ? renderCrest(saved, { prefix: 'saved-' }) : ''), [saved]);

  return (
    <div class="start">
      <header class="hero">
        <svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 8h44v26c0 12-10 19-22 24C20 53 10 46 10 34z" fill="currentColor" /><path d="M32 14v38M14 28h36" stroke="#e0b44c" stroke-width="4" /></svg>
        <h1>Герб семьи</h1>
        <p>
          Соберите герб своей семьи из рабочих сфер, животных, природы, цветов и символов. Начните с чистого листа или возьмите шаблон и измените в нём всё, что захотите.
          Готовый герб можно скачать в PNG, PDF и SVG.
        </p>
      </header>

      <section aria-labelledby="start-h">
        <h2 id="start-h">С чего начнём?</h2>
        <div class="cards">
          {saved && (
            <button type="button" class="card-btn saved" onClick={() => openDoc(saved)}>
              <div class="thumb-box" dangerouslySetInnerHTML={{ __html: savedSvg }} />
              <b>Продолжить</b>
              <span>Ваш герб, который вы начали на этом устройстве</span>
            </button>
          )}
          <button type="button" class="card-btn blank" onClick={() => openDoc(emptyDoc())}>
            <div class="thumb-box blank-box" aria-hidden="true"><span>+</span></div>
            <b>Чистый лист</b>
            <span>Полная свобода: щит, символы и орнаменты ставятся куда угодно</span>
          </button>
          {cards.map(({ t, svg }) => (
            <button key={t.id} type="button" class="card-btn" onClick={() => openDoc(t.make())}>
              <div class="thumb-box" dangerouslySetInnerHTML={{ __html: svg }} />
              <b>{t.name}</b>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
        {saved && <p class="hint center">Новый герб заменит тот, что сохранён на этом устройстве. Чтобы сохранить его, скачайте проект в файл через меню «Файл».</p>}
      </section>

      <footer class="start-foot">
        <button type="button" class="btn" onClick={pickFile}>Открыть проект из файла</button>
        <button type="button" class="btn" onClick={() => setState({ dialog: 'about' })}>О сайте и практике</button>
        <button type="button" class="btn danger" onClick={() => void wipe()}>Стереть мои данные</button>
      </footer>
      {dialog === 'about' && <About onClose={() => setState({ dialog: null })} />}
    </div>
  );
}
