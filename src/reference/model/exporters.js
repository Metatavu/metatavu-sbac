/**
 * Browser-side export: SVG download, PNG rasterization, PDF via the print view.
 * The only DOM-dependent part of the export path; `renderSvg` stays pure.
 */

import { renderSvg } from './renderSvg.js';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const svgDataUrl = (svg) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function exportSvg(doc, options, basename) {
  const { svg, width, height } = renderSvg(doc, options);
  triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), `${basename}.svg`);
  return `Saved ${basename}.svg — ${width}×${height} px`;
}

/** Rasterize the rendered SVG at `scale`. Resolves with a status message. */
export function exportPng(doc, options, basename, scale = 2) {
  const { svg, width, height } = renderSvg(doc, options);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        triggerDownload(blob, `${basename}@${scale}x.png`);
        resolve(`Saved PNG — ${canvas.width}×${canvas.height} px`);
      }, 'image/png');
    };
    image.onerror = () => reject(new Error('Rasterization failed — export SVG instead.'));
    image.src = svgDataUrl(svg);
  });
}

/**
 * Open a print view containing only the diagram, sized to it.
 * In a desktop shell (Electron/Tauri) call the host's print-to-PDF API instead.
 */
export function exportPdf(doc, options, basename) {
  const { svg, width, height } = renderSvg(doc, options);
  const landscape = width >= height;
  const win = window.open('', '_blank');
  if (!win) throw new Error('Allow pop-ups to print to PDF.');
  const pageSize = landscape ? '400mm 277mm' : '277mm 400mm';
  const css = `@page{size:${landscape ? 'A3 landscape' : 'A3 portrait'};margin:10mm}html,body{margin:0;padding:0;width:${pageSize.split(' ')[0]};height:${pageSize.split(' ')[1]};overflow:hidden}svg{width:100%;height:100%;display:block}`;
  win.document.open();
  win.document.write(
    `<!doctype html><html><head><title>${basename}</title><style>${css}</style></head><body>${svg}</body></html>`
  );
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* the user can print manually */
    }
  }, 400);
  return 'Opened the print view — choose "Save as PDF".';
}
