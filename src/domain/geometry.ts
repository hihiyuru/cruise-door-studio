import type { KeepOut, Rect, Sticker } from './types'

/** Extra margin kept around artwork so anti-aliased edges are never clipped. */
const EDGE = 0.3
export const CUT_LINE = 0.35

export const stickerH = (s: Pick<Sticker, 'w' | 'ar'>) => s.w * s.ar
export const padMm = (s: Pick<Sticker, 'border' | 'cut'>) => s.border + (s.cut ? CUT_LINE : 0) + EDGE

/** Finished size of a sticker, white border and cutting line included. */
export function outer(s: Pick<Sticker, 'w' | 'ar' | 'border' | 'cut'>) {
  const p = padMm(s)
  return { w: s.w + 2 * p, h: stickerH(s) + 2 * p }
}

/** Axis-aligned bounds of a rotated sticker on the door. */
export function bbox(s: Sticker): Rect {
  const o = outer(s)
  const a = (s.rot * Math.PI) / 180
  const c = Math.abs(Math.cos(a))
  const n = Math.abs(Math.sin(a))
  const W = o.w * c + o.h * n
  const H = o.w * n + o.h * c
  return { x: s.x - W / 2, y: s.y - H / 2, w: W, h: H }
}

/** Names of the no-stick zones a sticker overlaps, plus「門外」when it leaves the door. */
export function hits(s: Sticker, keepOut: KeepOut[], door: { w: number; h: number }): string[] {
  const b = bbox(s)
  const out: string[] = []
  for (const k of keepOut) {
    if (k.type === 'rect') {
      if (b.x < k.x + k.w && b.x + b.w > k.x && b.y < k.y + k.h && b.y + b.h > k.y) out.push(k.name)
    } else {
      const nx = Math.max(b.x, Math.min(k.cx, b.x + b.w))
      const ny = Math.max(b.y, Math.min(k.cy, b.y + b.h))
      if ((nx - k.cx) ** 2 + (ny - k.cy) ** 2 < k.r * k.r) out.push(k.name)
    }
  }
  if (b.x < 0 || b.y < 0 || b.x + b.w > door.w || b.y + b.h > door.h) out.push('門外')
  return out
}

/** Effective print resolution of a raster asset of `pxWidth` printed `wMm` wide. */
export const dpiOf = (pxWidth: number, wMm: number) => Math.round(pxWidth / (wMm / 25.4))

/** Below this a printed picture looks soft at arm's length; people stand that close to a cabin door. */
export const BLURRY_DPI = 150
/** Whether a picture will print blurry. Vectors never do; the examples are only for trying things out. */
export const isBlurry = (art: { isSvg: boolean; pxWidth: number }, s: Pick<Sticker, 'w' | 'sample'>) =>
  !art.isSvg && !s.sample && dpiOf(art.pxWidth, s.w) < BLURRY_DPI

/** Angles the rotation snaps to, and how close (degrees) it has to be. */
export const SNAP_ANGLES = [-180, -90, 0, 90, 180]
export const SNAP_TOLERANCE_DEG = 4
export const snapAngle = (deg: number) => SNAP_ANGLES.find(t => Math.abs(deg - t) <= SNAP_TOLERANCE_DEG) ?? deg

/** A sticker may be at most this many times the door width (lets people overshoot while resizing). */
const MAX_WIDTH_PER_DOOR = 1.5
/** Smallest sticker anyone can still pick up. */
export const MIN_STICKER_MM = 10
export const clampStickerWidth = (w: number, doorW: number) => Math.max(MIN_STICKER_MM, Math.min(doorW * MAX_WIDTH_PER_DOOR, w))

/**
 * Largest artwork width (rounded down to 0.5 cm) that lets the sticker fit an area
 * of usableW × usableH in either orientation. Returns null when it already fits.
 */
export function widthToFit(s: Pick<Sticker, 'w' | 'ar' | 'border' | 'cut'>, usableW: number, usableH: number): number | null {
  const o = outer(s)
  if ((o.w <= usableW && o.h <= usableH) || (o.h <= usableW && o.w <= usableH)) return null
  const p2 = 2 * padMm(s)
  const upright = Math.min(usableW - p2, (usableH - p2) / s.ar)
  const sideways = Math.min(usableH - p2, (usableW - p2) / s.ar)
  const best = Math.max(upright, sideways)
  return best > 0 ? Math.floor(best / 5) * 5 : null
}
