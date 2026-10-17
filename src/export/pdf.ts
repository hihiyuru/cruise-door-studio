import type { jsPDF } from 'jspdf'
import type { Placement } from '../domain/packing'
import { OVERLAP, TILE_LABEL_MM } from '../domain/packing'
import { outer } from '../domain/geometry'
import { svgAtWidth, type ArtworkLookup } from '../render/artwork'
import { renderSticker } from '../render/sticker'
import { cropTo, onWhite, rot90, type Canvas } from '../render/canvas'

/** 350 dpi, the raster resolution print shops ask for (pixels per millimetre). */
export const PRINT_PPM = 350 / 25.4
/** Longest side of one render. */
const MAX_SIDE_PX = 10000
/**
 * Largest area of one render. iOS Safari refuses canvases above 16,777,216 px and hands back a blank one,
 * so very large stickers print at a little under 350 dpi instead of not at all.
 */
const MAX_AREA_PX = 16_000_000

/** A sticker's picture is gone (for example a backup whose image could not be decoded). */
export class MissingArtworkError extends Error {
  stickerName: string
  constructor(stickerName: string) {
    super(`missing artwork for ${stickerName}`)
    this.stickerName = stickerName
  }
}

export interface PdfOptions {
  paper: { w: number; h: number }
  margin: number
  /** Where pictures come from; the export layer does not read the store itself. */
  getArtwork: ArtworkLookup
  /** Split into several files of at most this many bytes (ibon upload limit). */
  maxFileBytes?: number
  onProgress?: (done: number, total: number) => void
}

const JPEG_QUALITY = 0.92
const SCALE_BAR_MM = 50

interface RenderedPage { images: { data: string; x: number; y: number; w: number; h: number }[]; labels: { text: string; x: number; y: number }[]; bytes: number }

/**
 * Full-size renders shared by every piece of a split sticker, so a sticker cut into six is drawn once, not six times.
 * Each entry is dropped as soon as its last piece has been placed.
 */
class StickerRenders {
  private renders = new Map<string, Canvas>()
  private remaining = new Map<string, number>()
  private getArtwork: ArtworkLookup
  constructor(sheets: Placement[][], getArtwork: ArtworkLookup) {
    this.getArtwork = getArtwork
    for (const p of sheets.flat()) this.remaining.set(p.sticker.id, (this.remaining.get(p.sticker.id) ?? 0) + 1)
  }

  async piece(p: Placement): Promise<Canvas> {
    const s = p.sticker
    const o = outer(s)
    let full = this.renders.get(s.id)
    if (!full) {
      const a = this.getArtwork(s.assetId)
      if (!a) throw new MissingArtworkError(s.name)
      const ppm = Math.min(PRINT_PPM, MAX_SIDE_PX / Math.max(o.w, o.h), Math.sqrt(MAX_AREA_PX / (o.w * o.h)))
      const art = a.isSvg ? await svgAtWidth(a.blob, s.w * ppm) : a.art
      full = renderSticker(s, art, ppm)
      this.renders.set(s.id, full)
    }
    const left = (this.remaining.get(s.id) ?? 1) - 1
    this.remaining.set(s.id, left)
    if (left <= 0) this.renders.delete(s.id)
    let c = p.crop ? cropTo(full, p.crop, o) : full
    if (p.rot) c = rot90(c)
    return onWhite(c)
  }
}

async function renderPage(sheet: Placement[], renders: StickerRenders): Promise<RenderedPage> {
  const page: RenderedPage = { images: [], labels: [], bytes: 0 }
  for (const p of sheet) {
    const data = (await renders.piece(p)).toDataURL('image/jpeg', JPEG_QUALITY)
    page.bytes += data.length * 0.75
    page.images.push({ data, x: p.x, y: p.y, w: p.pw, h: p.ph })
    // the packer leaves TILE_LABEL_MM free under every piece of a split sticker for this line
    if (p.tile) page.labels.push({ text: `${p.tile.label}-${p.tile.i}/${p.tile.n}  (overlap ${OVERLAP} mm)`, x: p.x, y: p.y + p.ph + TILE_LABEL_MM * 0.75 })
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
  doc.line(m, by, m + SCALE_BAR_MM, by)
  for (let t = 0; t <= SCALE_BAR_MM; t += 10) doc.line(m + t, by - (t % SCALE_BAR_MM ? 1 : 1.8), m + t, by)
  doc.setFontSize(7)
  doc.text(`${SCALE_BAR_MM} mm scale  |  Print at 100% / Actual size  |  ${paper.w}x${paper.h} mm  ${n}/${total}`, m + SCALE_BAR_MM + 3, by + 0.8)
}

// jsPDF is large; load it only when someone actually downloads
let JsPDF: typeof jsPDF | null = null
const newDoc = (paper: { w: number; h: number }) =>
  new JsPDF!({ unit: 'mm', format: [paper.w, paper.h], orientation: paper.w > paper.h ? 'landscape' : 'portrait', compress: true })

/** Render every sheet at 350 dpi. Returns one PDF, or several when `maxFileBytes` is set and exceeded. */
export async function buildPdfs(sheets: Placement[][], opts: PdfOptions): Promise<{ blob: Blob; from: number; to: number }[]> {
  JsPDF ??= (await import('jspdf')).jsPDF
  const files: { doc: jsPDF; bytes: number; from: number; to: number }[] = []
  const renders = new StickerRenders(sheets, opts.getArtwork)
  for (const [i, sheet] of sheets.entries()) {
    const page = await renderPage(sheet, renders)
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
