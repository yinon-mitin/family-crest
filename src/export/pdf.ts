import type { CrestDoc } from '../model/types.ts';
import { buildPages, PAGE_H, PAGE_W } from './story.ts';

export async function exportPdf(doc: CrestDoc, withStory: boolean): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({
    title: doc.family ? `Герб семьи ${doc.family}` : 'Герб семьи',
    subject: 'Герб семьи',
    creator: 'Герб семьи (family-crest)',
  });
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden';
  document.body.appendChild(host);
  try {
    const pages = buildPages(doc, withStory);
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage('a4', 'portrait');
      host.innerHTML = pages[i];
      const el = host.firstElementChild as SVGElement;
      await svg2pdf(el, pdf, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    }
  } finally {
    host.remove();
  }
  return pdf.output('blob');
}
