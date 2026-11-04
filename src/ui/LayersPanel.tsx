import { moveLayer, select, updateLayer, useStore } from '../model/store.ts';
import { t } from '../i18n/index.ts';
import { kindLabel, layerTitle } from './names.ts';

export function LayersPanel() {
  const doc = useStore((s) => s.doc);
  const selected = useStore((s) => s.selected);
  const list = [...doc.layers].reverse();
  return (
    <div class="panel layers-panel">
      <h3 class="panel-title">{t('layers.title')}</h3>
      {list.length === 0 && <p class="hint">{t('layers.hint')}</p>}
      <ul class="layers">
        {list.map((l) => (
          <li key={l.id} class={`${l.id === selected ? 'on' : ''}${l.hidden ? ' off' : ''}`}>
            <button type="button" class="layer-main" onClick={() => select(l.id)} aria-pressed={l.id === selected}>
              <span class="kind">{kindLabel(l.kind)}</span>
              <span class="name">{layerTitle(l)}</span>
            </button>
            <button type="button" class="mini" title={l.hidden ? t('props.show') : t('props.hide')} aria-label={l.hidden ? t('props.show') : t('props.hide')} onClick={() => updateLayer(l.id, { hidden: !l.hidden })}>{l.hidden ? '○' : '●'}</button>
            <button type="button" class="mini" title={l.locked ? t('props.unlock') : t('props.lock')} aria-label={l.locked ? t('props.unlock') : t('props.lock')} onClick={() => updateLayer(l.id, { locked: !l.locked })}>{l.locked ? '🔒' : '🔓'}</button>
            <button type="button" class="mini" title={t('props.up')} aria-label={t('props.up')} onClick={() => moveLayer(l.id, 1)}>↑</button>
            <button type="button" class="mini" title={t('props.down')} aria-label={t('props.down')} onClick={() => moveLayer(l.id, -1)}>↓</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
