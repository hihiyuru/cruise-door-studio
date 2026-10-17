import type { KeepOut, Sticker } from './types'
import { bbox, hits, outer } from './geometry'

/** Space kept between a new sticker and its neighbours. */
const NEIGHBOUR_GAP_MM = 8
/** Distance kept from the door's left and right edges. */
const EDGE_MM = 15
/** Distance kept from the bottom of the door. */
const BOTTOM_MM = 10
/** How far apart the candidate positions are. */
const SCAN_STEP_MM = 10
/** New pictures go in the lower half, away from the number plate, where people usually start decorating. */
const SCAN_FROM = 0.5

/** First spot in the lower half of the door where `s` overlaps no other sticker and no keep-out zone. */
export function freeSpot(s: Sticker, others: Sticker[], door: { w: number; h: number; keepOut: KeepOut[] }): { x: number; y: number } | null {
  const o = outer(s)
  const boxes = others.map(bbox)
  for (let y = door.h * SCAN_FROM + o.h / 2; y <= door.h - o.h / 2 - BOTTOM_MM; y += SCAN_STEP_MM) {
    for (let x = o.w / 2 + EDGE_MM; x <= door.w - o.w / 2 - EDGE_MM; x += SCAN_STEP_MM) {
      const candidate = { ...s, x, y }
      if (hits(candidate, door.keepOut, door).length) continue
      const b = bbox(candidate)
      const g = NEIGHBOUR_GAP_MM
      if (boxes.some(r => b.x < r.x + r.w + g && b.x + b.w + g > r.x && b.y < r.y + r.h + g && b.y + b.h + g > r.y)) continue
      return { x, y }
    }
  }
  return null
}
