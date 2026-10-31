import { download, fileName } from '../export/download.ts';
import { clearAuto, fromFile, toFile } from '../model/serialize.ts';
import { emptyDoc } from '../model/doc.ts';
import { getState, openDoc, toast } from '../model/store.ts';

export function saveFile(): void {
  const { doc } = getState();
  download(new Blob([toFile(doc)], { type: 'application/json' }), fileName(doc, 'json', '-проект'));
  toast('Проект сохранён в файл');
}

export async function openFile(file: File): Promise<void> {
  if (file.size > 5_000_000) {
    toast('Файл слишком большой для проекта герба');
    return;
  }
  const doc = fromFile(await file.text());
  if (!doc) {
    toast('Не удалось открыть: это не файл проекта герба');
    return;
  }
  openDoc(doc);
}

export function pickFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => input.files?.[0] && void openFile(input.files[0]);
  input.click();
}

/** Полностью стирает данные участника с этого устройства. */
export function wipe(): boolean {
  if (!window.confirm('Стереть созданный герб и все заметки с этого устройства? Это нельзя отменить.')) return false;
  clearAuto();
  openDoc(emptyDoc());
  return true;
}
