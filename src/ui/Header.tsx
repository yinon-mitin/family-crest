import { goStart, redo, setDoc, setState, undo, useStore } from '../model/store.ts';
import { pickFile, saveFile, wipe } from './files.ts';

export function Header() {
  const family = useStore((s) => s.doc.family);
  const close = (e: Event) => ((e.currentTarget as HTMLElement).closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
  return (
    <header class="topbar">
      <button type="button" class="brand" onClick={goStart} title="К выбору шаблона">
        <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 8h44v26c0 12-10 19-22 24C20 53 10 46 10 34z" fill="currentColor" /><path d="M32 14v38M14 28h36" stroke="#e0b44c" stroke-width="4" /></svg>
        <span>Герб семьи</span>
      </button>
      <label class="family">
        <span class="sr">Название семьи</span>
        <input type="text" maxLength={60} placeholder="Название семьи (для PDF)" value={family} onInput={(e) => setDoc({ family: (e.target as HTMLInputElement).value }, 'family')} />
      </label>
      <details class="menu">
        <summary class="btn">Файл</summary>
        <div class="menu-list" onClick={close}>
          <button type="button" onClick={goStart}>Новый герб или шаблон</button>
          <button type="button" onClick={saveFile}>Сохранить в файл</button>
          <button type="button" onClick={pickFile}>Открыть из файла</button>
          <button type="button" onClick={() => setState({ dialog: 'about' })}>О сайте</button>
          <button type="button" class="danger" onClick={() => void wipe()}>Стереть мои данные</button>
        </div>
      </details>
      <button type="button" class="btn primary" onClick={() => setState({ dialog: 'export' })}>Скачать</button>
    </header>
  );
}

export function StageBar() {
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  return (
    <div class="stagebar">
      <button type="button" class="btn" onClick={undo} disabled={!past} title="Отменить (Ctrl+Z)">↶ Отменить</button>
      <button type="button" class="btn" onClick={redo} disabled={!future} title="Повторить (Ctrl+Y)">↷ Повторить</button>
    </div>
  );
}
