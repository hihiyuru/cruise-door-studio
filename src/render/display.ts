import type { Sticker } from '../domain/types'
import { assets } from '../stores/assets'
import { renderSticker } from './sticker'
import type { Canvas } from './canvas'

/** On-screen resolution, pixels per millimetre. */
export const DISPLAY_PPM = 3

const cache = new Map<string, Canvas>()

/** Low-resolution rendering used on the door and in sheet previews; cached by what affects its look. */
export function displayCanvas(s: Sticker): Canvas | null {
  const a = assets.get(s.assetId)
  if (!a) return null
  const key = `${s.assetId}|${s.w.toFixed(1)}|${s.border}|${s.cut}`
  let c = cache.get(key)
  if (!c) {
    c = renderSticker(s, a.art, DISPLAY_PPM)
    if (cache.size > 300) cache.delete(cache.keys().next().value!)
    cache.set(key, c)
  }
  return c
}
