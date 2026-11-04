import { useState } from 'preact/hooks';
import { download, fileName } from '../export/download.ts';
import { exportPdf } from '../export/pdf.ts';
import { exportPng } from '../export/png.ts';
import { exportSvg, type Background } from '../export/svg.ts';
import { t } from '../i18n/index.ts';
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
      toast(t('export.done'));
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('export.failed'));
    } finally {
      setBusy(false);
    }
  };

  const empty = doc.layers.length === 0;
  return (
    <Modal title={t('export.title')} onClose={close}>
      {empty && <p class="warn">{t('export.empty')}</p>}
      <div class="field">
        <div class="field-label">{t('export.format')}</div>
        <div class="segmented" role="radiogroup" aria-label={t('export.format')}>
          {([['png', 'PNG'], ['pdf', 'PDF'], ['svg', 'SVG']] as const).map(([id, name]) => (
            <button key={id} type="button" role="radio" aria-checked={format === id} class={format === id ? 'on' : ''} onClick={() => setFormat(id)}>
              {name}
              <small>{t(`export.${id}`)}</small>
            </button>
          ))}
        </div>
      </div>
      {format === 'png' && (
        <div class="field">
          <label class="field-label" for="png-size">{t('export.size')}</label>
          <select id="png-size" value={size} onChange={(e) => setSize(Number((e.target as HTMLSelectElement).value))}>
            <option value={1024}>{t('export.size1024')}</option>
            <option value={2048}>{t('export.size2048')}</option>
            <option value={4096}>{t('export.size4096')}</option>
          </select>
        </div>
      )}
      {format !== 'pdf' && (
        <div class="field">
          <label class="field-label" for="bg">{t('export.background')}</label>
          <select id="bg" value={bg} onChange={(e) => setBg((e.target as HTMLSelectElement).value as Background)}>
            <option value="transparent">{t('export.bgTransparent')}</option>
            <option value="white">{t('export.bgWhite')}</option>
            {doc.background && <option value="canvas">{t('export.bgCanvas')}</option>}
          </select>
        </div>
      )}
      {format === 'pdf' && (
        <label class="check">
          <input type="checkbox" checked={story} onChange={(e) => setStory((e.target as HTMLInputElement).checked)} />
          <span>{t('export.story')}</span>
        </label>
      )}
      {format === 'pdf' && <p class="hint">{t('export.pdfHint')}</p>}
      {format === 'svg' && <p class="hint">{t('export.svgHint')}</p>}
      {error && <p class="warn" role="alert">{error}</p>}
      <div class="row end">
        <button type="button" class="btn" onClick={close}>{t('export.cancel')}</button>
        <button type="button" class="btn primary" disabled={busy || empty} onClick={run}>{busy ? t('export.busy') : t('export.run')}</button>
      </div>
    </Modal>
  );
}
