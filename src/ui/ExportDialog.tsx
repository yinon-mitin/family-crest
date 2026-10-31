import { useState } from 'preact/hooks';
import { download, fileName } from '../export/download.ts';
import { exportPdf } from '../export/pdf.ts';
import { exportPng } from '../export/png.ts';
import { exportSvg, type Background } from '../export/svg.ts';
import { setState, toast, useStore } from '../model/store.ts';
import { Modal } from './Modal.tsx';

type Format = 'png' | 'pdf' | 'svg';

export function ExportDialog() {
  const doc = useStore((s) => s.doc);
  const [format, setFormat] = useState<Format>('png');
  const [size, setSize] = useState(2048);
  const [bg, setBg] = useState<Background>(doc.background ? 'canvas' : 'transparent');
  const [story, setStory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => setState({ dialog: null });

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      if (format === 'svg') download(exportSvg(doc, bg), fileName(doc, 'svg'));
      else if (format === 'png') download(await exportPng(doc, size, bg), fileName(doc, 'png', `-${size}`));
      else download(await exportPdf(doc, story), fileName(doc, 'pdf'));
      toast('Файл готов: проверьте папку «Загрузки»');
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать файл. Попробуйте ещё раз или выберите другой формат.');
    } finally {
      setBusy(false);
    }
  };

  const empty = doc.layers.length === 0;
  return (
    <Modal title="Скачать герб" onClose={close}>
      {empty && <p class="warn">Герб пока пустой. Добавьте хотя бы один элемент.</p>}
      <div class="field">
        <div class="field-label">Формат</div>
        <div class="segmented" role="radiogroup" aria-label="Формат">
          {([['png', 'PNG', 'картинка'], ['pdf', 'PDF', 'для печати'], ['svg', 'SVG', 'вектор']] as const).map(([id, name, note]) => (
            <button key={id} type="button" role="radio" aria-checked={format === id} class={format === id ? 'on' : ''} onClick={() => setFormat(id)}>
              {name}
              <small>{note}</small>
            </button>
          ))}
        </div>
      </div>
      {format === 'png' && (
        <div class="field">
          <label class="field-label" for="png-size">Размер</label>
          <select id="png-size" value={size} onChange={(e) => setSize(Number((e.target as HTMLSelectElement).value))}>
            <option value={1024}>1024 × 1229 (для экрана)</option>
            <option value={2048}>2048 × 2458 (для печати)</option>
            <option value={4096}>4096 × 4915 (максимум)</option>
          </select>
        </div>
      )}
      {format !== 'pdf' && (
        <div class="field">
          <label class="field-label" for="bg">Фон</label>
          <select id="bg" value={bg} onChange={(e) => setBg((e.target as HTMLSelectElement).value as Background)}>
            <option value="transparent">Прозрачный</option>
            <option value="white">Белый</option>
            {doc.background && <option value="canvas">Цвет холста</option>}
          </select>
        </div>
      )}
      {format === 'pdf' && (
        <label class="check">
          <input type="checkbox" checked={story} onChange={(e) => setStory((e.target as HTMLInputElement).checked)} />
          <span>Добавить рассказ о гербе: значения символов и ваши заметки</span>
        </label>
      )}
      {format === 'pdf' && <p class="hint">Страница A4: на первой странице герб, затем рассказ. Текст в PDF записан контурами, поэтому его нельзя выделить, зато он выглядит одинаково везде.</p>}
      {format === 'svg' && <p class="hint">Векторный файл можно увеличивать без потери качества и открывать в графических редакторах.</p>}
      {error && <p class="warn" role="alert">{error}</p>}
      <div class="row end">
        <button type="button" class="btn" onClick={close}>Отмена</button>
        <button type="button" class="btn primary" disabled={busy || empty} onClick={run}>{busy ? 'Готовлю файл…' : 'Скачать'}</button>
      </div>
    </Modal>
  );
}
