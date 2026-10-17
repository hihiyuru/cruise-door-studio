import type { jsPDF } from 'jspdf'
import type { Placement } from '../domain/packing'
import { outer } from '../domain/geometry'
import { assets, svgAtWidth } from '../stores/assets'
import { renderSticker } from '../render/sticker'
import { cropTo, onWhite, rot90, type Canvas } from '../render/canvas'

/** 350 dpi, the raster resolution print shops ask for. */
export const PRINT_PPM = 350 / 25.4
/** Very large stickers are capped so the canvas stays within browser limits. */
const MAX_PX = 10000

export interface PdfOptions {
  paper: { w: number; h: number }
  margin: number
  /** Split into several files of at most this many bytes (ibon upload limit). */
  maxFileBytes?: number
  onProgress?: (done: number, total: number) => void
}

interface RenderedPage { images: { data: string; x: number; y: number; w: number; h: number }[]; labels: { text: string; x: number; y: number }[]; bytes: number }

async function piecePixels(p: Placement): Promise<Canvas> {
  const s = p.sticker
  const a = assets.get(s.assetId)
  if (!a) throw new Error(`找不到「${s.name}」的圖片`)
  const o = outer(s)
  const ppm = Math.min(PRINT_PPM, MAX_PX / Math.max(o.w, o.h))
  const art = a.isSvg ? await svgAtWidth(a, s.w * ppm) : a.art
  let c = renderSticker(s, art, ppm)
  if (p.crop) c = cropTo(c, p.crop, o)
  if (p.rot) c = rot90(c)
  return onWhite(c)
}

async function renderPage(sheet: Placement[], paperH: number): Promise<RenderedPage> {
  const page: RenderedPage = { images: [], labels: [], bytes: 0 }
  for (const p of sheet) {
    const data = (await piecePixels(p)).toDataURL('image/jpeg', 0.92)
    page.bytes += data.length * 0.75
    page.images.push({ data, x: p.x, y: p.y, w: p.pw, h: p.ph })
    if (p.tile) page.labels.push({ text: `${p.tile.label}-${p.tile.i}/${p.tile.n}  (overlap 10 mm)`, x: p.x, y: Math.min(paperH - 1, p.y + p.ph + 2.6) })
    // let the page repaint between big pieces
    await new Promise(r => setTimeout(r, 0))
  }
  return page
}

function drawPage(doc: jsPDF, page: RenderedPage, opts: PdfOptions, n: number, total: number) {
  const { paper, margin: m } = opts
  for (const im of page.images) doc.addImage(im.data, 'JPEG', im.x, im.y, im.w, im.h, undefined, 'FAST')
  doc.setFontSize(6)
  doc.setTextColor(90)
  for (const l of page.labels) doc.text(l.text, l.x, l.y)
  // 50 mm scale bar in the bottom margin, to check the print came out 1:1
  const by = paper.h - m / 2
  doc.setDrawColor(90)
  doc.setLineWidth(0.3)
  doc.line(m, by, m + 50, by)
  for (let t = 0; t <= 50; t += 10) doc.line(m + t, by - (t % 50 ? 1 : 1.8), m + t, by)
  doc.setFontSize(7)
  doc.text(`50 mm scale  |  Print at 100% / Actual size  |  ${paper.w}x${paper.h} mm  ${n}/${total}`, m + 53, by + 0.8)
}

// jsPDF is large; load it only when someone actually downloads
let JsPDF: typeof jsPDF | null = null
const newDoc = (paper: { w: number; h: number }) =>
  new JsPDF!({ unit: 'mm', format: [paper.w, paper.h], orientation: paper.w > paper.h ? 'landscape' : 'portrait', compress: true })

/** Render every sheet at 350 dpi. Returns one PDF, or several when `maxFileBytes` is set and exceeded. */
export async function buildPdfs(sheets: Placement[][], opts: PdfOptions): Promise<{ blob: Blob; from: number; to: number }[]> {
  JsPDF ??= (await import('jspdf')).jsPDF
  const files: { doc: jsPDF; bytes: number; from: number; to: number }[] = []
  for (const [i, sheet] of sheets.entries()) {
    const page = await renderPage(sheet, opts.paper.h)
    let cur = files.at(-1)
    if (!cur || (opts.maxFileBytes && cur.bytes > 0 && cur.bytes + page.bytes > opts.maxFileBytes)) {
      cur = { doc: newDoc(opts.paper), bytes: 0, from: i + 1, to: i + 1 }
      files.push(cur)
    } else {
      cur.doc.addPage([opts.paper.w, opts.paper.h], opts.paper.w > opts.paper.h ? 'landscape' : 'portrait')
    }
    drawPage(cur.doc, page, opts, i + 1, sheets.length)
    cur.bytes += page.bytes
    cur.to = i + 1
    opts.onProgress?.(i + 1, sheets.length)
  }
  return files.map(f => ({ blob: f.doc.output('blob'), from: f.from, to: f.to }))
}
