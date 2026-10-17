import type { Rect, Sticker } from './types'
import { outer } from './geometry'

/** Adjacent strips of a split sticker share this much artwork, for gluing. */
export const OVERLAP = 10

export interface Piece {
  /** Unique per piece; stickers use their id, strips use `${id}#${n}`. */
  key: string
  sticker: Sticker
  /** Unrotated size on paper. */
  w: number
  h: number
  /** For strips: the part of the finished sticker (outer coordinates) this piece shows. */
  crop?: Rect
  /** For strips: [index (1-based), count] and the letter shared by the strips of one sticker. */
  tile?: { i: number; n: number; label: string }
}

export interface Placement extends Piece {
  /** Position on the sheet, margins included. */
  x: number
  y: number
  /** True when the piece is turned 90° clockwise to fit. */
  rot: boolean
  /** Size as laid on the sheet (swapped when rotated). */
  pw: number
  ph: number
}

export interface Layout {
  sheets: Placement[][]
  tooBig: Piece[]
  /** First strip of every split sticker, for the summary. */
  split: Piece[]
}

/** How many pieces of at most `max` (sharing OVERLAP) cover `len`, and how long each piece is. */
function cut(len: number, max: number): { n: number; seg: number } | null {
  if (len <= max) return { n: 1, seg: len }
  if (max <= OVERLAP * 2) return null
  const n = Math.ceil((len - OVERLAP) / (max - OVERLAP))
  return { n, seg: (len + (n - 1) * OVERLAP) / n }
}

/**
 * Split an oversized sticker into a grid of pieces that each fit usableW × usableH,
 * neighbours sharing OVERLAP mm for gluing. Pieces are numbered row by row.
 * Null when the paper is too small to split onto at all.
 */
export function tilesFor(s: Sticker, usableW: number, usableH: number, label: string): Piece[] | null {
  const o = outer(s)
  let best: { cols: { n: number; seg: number }; rows: { n: number; seg: number } } | null = null
  // a piece may lie either way round on the sheet, so try both orientations of the cell
  for (const [cw, ch] of [[usableW, usableH], [usableH, usableW]]) {
    const cols = cut(o.w, cw)
    const rows = cut(o.h, ch)
    if (!cols || !rows || cols.n * rows.n < 2) continue
    if (!best || cols.n * rows.n < best.cols.n * best.rows.n) best = { cols, rows }
  }
  if (!best) return null
  const { cols, rows } = best
  const n = cols.n * rows.n
  const pieces: Piece[] = []
  for (let r = 0; r < rows.n; r++) {
    for (let c = 0; c < cols.n; c++) {
      const crop = { x: c * (cols.seg - OVERLAP), y: r * (rows.seg - OVERLAP), w: cols.seg, h: rows.seg }
      const i = pieces.length + 1
      pieces.push({ key: `${s.id}#${i}`, sticker: s, w: crop.w, h: crop.h, crop, tile: { i, n, label } })
    }
  }
  return pieces
}

/* ---------- MaxRects bin packing (best short side fit) ---------- */

class Bin {
  free: Rect[]
  used: Placement[] = []
  constructor(W: number, H: number) {
    this.free = [{ x: 0, y: 0, w: W, h: H }]
  }

  /** Best position for a w × h box; lower score is better. */
  find(w: number, h: number): { x: number; y: number; rot: boolean; score: [number, number] } | null {
    let best: { x: number; y: number; rot: boolean; score: [number, number] } | null = null
    for (const f of this.free) {
      for (const rot of [false, true]) {
        const bw = rot ? h : w
        const bh = rot ? w : h
        if (bw > f.w + 1e-6 || bh > f.h + 1e-6) continue
        const short = Math.min(f.w - bw, f.h - bh)
        const long = Math.max(f.w - bw, f.h - bh)
        if (!best || short < best.score[0] || (short === best.score[0] && long < best.score[1])) {
          best = { x: f.x, y: f.y, rot, score: [short, long] }
        }
      }
    }
    return best
  }

  place(r: Rect) {
    const next: Rect[] = []
    for (const f of this.free) {
      if (r.x >= f.x + f.w || r.x + r.w <= f.x || r.y >= f.y + f.h || r.y + r.h <= f.y) {
        next.push(f)
        continue
      }
      if (r.x > f.x) next.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h })
      if (r.x + r.w < f.x + f.w) next.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - (r.x + r.w), h: f.h })
      if (r.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y })
      if (r.y + r.h < f.y + f.h) next.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - (r.y + r.h) })
    }
    // drop free rects contained in another
    this.free = next.filter((a, i) =>
      !next.some((b, j) => j !== i && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h
        && (j < i || a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h)))
  }
}

const ORDERS: ((a: Piece, b: Piece) => number)[] = [
  (a, b) => b.w * b.h - a.w * a.h,
  (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h),
  (a, b) => b.h - a.h || b.w - a.w,
  (a, b) => b.w - a.w || b.h - a.h,
  (a, b) => b.w + b.h - (a.w + a.h),
]

function packOnce(pieces: Piece[], usableW: number, usableH: number, gap: number, margin: number): Placement[][] {
  const bins: Bin[] = []
  for (const p of pieces) {
    // pad each box by the gap on its right and bottom; the bin grows by the same amount
    const w = p.w + gap
    const h = p.h + gap
    let target: Bin | null = null
    let spot: ReturnType<Bin['find']> = null
    for (const b of bins) {
      const s = b.find(w, h)
      if (s && (!spot || s.score[0] < spot.score[0] || (s.score[0] === spot.score[0] && s.score[1] < spot.score[1]))) {
        target = b
        spot = s
      }
    }
    if (!target || !spot) {
      target = new Bin(usableW + gap, usableH + gap)
      bins.push(target)
      spot = target.find(w, h)!
    }
    const pw = spot.rot ? p.h : p.w
    const ph = spot.rot ? p.w : p.h
    target.place({ x: spot.x, y: spot.y, w: pw + gap, h: ph + gap })
    target.used.push({ ...p, x: margin + spot.x, y: margin + spot.y, rot: spot.rot, pw, ph })
  }
  return bins.map(b => b.used)
}

/** Lay every sticker onto as few sheets as possible. */
export function layoutSheets(
  stickers: Sticker[],
  paper: { w: number; h: number },
  margin: number,
  gap: number,
): Layout {
  const UW = paper.w - 2 * margin
  const UH = paper.h - 2 * margin
  const pieces: Piece[] = []
  const tooBig: Piece[] = []
  const split: Piece[] = []
  let letter = 0
  for (const s of stickers) {
    const o = outer(s)
    const fits = (o.w <= UW && o.h <= UH) || (o.h <= UW && o.w <= UH)
    if (!fits && s.tile) {
      const strips = tilesFor(s, UW, UH, String.fromCharCode(65 + (letter % 26)))
      if (strips) {
        letter++
        pieces.push(...strips)
        split.push(strips[0])
        continue
      }
    }
    const p: Piece = { key: s.id, sticker: s, w: o.w, h: o.h }
    if (fits) pieces.push(p)
    else tooBig.push(p)
  }
  let best: Placement[][] | null = null
  for (const order of ORDERS) {
    const sheets = packOnce([...pieces].sort(order), UW, UH, gap, margin)
    if (!best || sheets.length < best.length) best = sheets
  }
  return { sheets: best ?? [], tooBig, split }
}
