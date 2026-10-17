import type { Sticker } from '../domain/types'
import { CUT_LINE, padMm, stickerH } from '../domain/geometry'
import { ctx2d, mk, type Canvas } from './canvas'

const CUT_COLOR = '#9AA3AD'

function silhouette(src: Canvas, color: string): Canvas {
  const c = mk(src.width, src.height)
  const x = ctx2d(c)
  x.drawImage(src, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, c.width, c.height)
  return c
}

/** Grow a mask by r px (approximating a disc with 16 directions, a few px per step), adding `pad` px of room. */
function dilate(mask: Canvas, r: number, pad: number): Canvas {
  let cur = mk(mask.width + 2 * pad, mask.height + 2 * pad)
  ctx2d(cur).drawImage(mask, pad, pad)
  let left = r
  const stepMax = Math.max(1.5, r / 5)
  while (left > 0.01) {
    const s = Math.min(left, stepMax)
    const next = mk(cur.width, cur.height)
    const x = ctx2d(next)
    x.drawImage(cur, 0, 0)
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8
      x.drawImage(cur, Math.cos(a) * s, Math.sin(a) * s)
    }
    cur = next
    left -= s
  }
  return cur
}

/**
 * Render the finished sticker (artwork + white border + optional cutting line)
 * at `ppm` pixels per millimetre. The result covers `outer(sticker)`.
 */
export function renderSticker(
  s: Pick<Sticker, 'w' | 'ar' | 'border' | 'cut'>,
  art: Canvas,
  ppm: number,
): Canvas {
  const bw = Math.max(1, Math.round(s.w * ppm))
  const bh = Math.max(1, Math.round(stickerH(s) * ppm))
  const pad = Math.round(padMm(s) * ppm)
  const sc = mk(bw, bh)
  const sx = ctx2d(sc)
  sx.imageSmoothingQuality = 'high'
  sx.drawImage(art, 0, 0, bw, bh)
  const out = mk(bw + 2 * pad, bh + 2 * pad)
  const ox = ctx2d(out)
  const b = s.border * ppm
  const c = s.cut ? Math.max(1, CUT_LINE * ppm) : 0
  if (s.cut) ox.drawImage(dilate(silhouette(sc, CUT_COLOR), b + c, pad), 0, 0)
  if (b > 0 || s.cut) ox.drawImage(dilate(silhouette(sc, '#FFFFFF'), b, pad), 0, 0)
  ox.drawImage(sc, pad, pad)
  return out
}
