import type { Sticker } from '../domain/types'
import { renderSticker } from './sticker'
import type { Canvas } from './canvas'

/** On-screen resolution, pixels per millimetre. */
export const DISPLAY_PPM = 3
/**
 * Pixel budget for cached renders (about 160 MB). Bounded by size rather than count, because dragging a slider
 * on one large sticker produces a new render per step and a count limit let those pile up into gigabytes.
 */
const CACHE_BUDGET_PX = 40_000_000

const cache = new Map<string, Canvas>()
let cachedPx = 0

/** Low-resolution rendering used on the door and in sheet previews; cached by what affects its look. */
export function displayCanvas(s: Sticker, art: Canvas | undefined): Canvas | null {
  if (!art) return null
  const key = `${s.assetId}|${s.w.toFixed(1)}|${s.border}|${s.cut}`
  const hit = cache.get(key)
  if (hit) {
    // refresh its place in the least-recently-used order
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }
  const c = renderSticker(s, art, DISPLAY_PPM)
  cache.set(key, c)
  cachedPx += c.width * c.height
  for (const [k, old] of cache) {
    if (cachedPx <= CACHE_BUDGET_PX || old === c) break
    cache.delete(k)
    cachedPx -= old.width * old.height
  }
  return c
}
