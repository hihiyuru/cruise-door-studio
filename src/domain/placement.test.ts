import { describe, expect, it } from 'vitest'
import { freeSpot } from './placement'
import { bbox, hits } from './geometry'
import { ADVENTURE } from './doors'
import type { Sticker } from './types'

const st = (id: string, extra: Partial<Sticker> = {}): Sticker => ({
  id, name: id, assetId: id, origAssetId: id, ar: 1, w: 100, x: 0, y: 0, rot: 0, border: 2, cut: false, tile: false, ...extra,
})
const overlap = (a: Sticker, b: Sticker) => {
  const p = bbox(a), q = bbox(b)
  return p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y
}

describe('freeSpot', () => {
  it('puts each new sticker in the lower half, clear of the others and of the lock', () => {
    const placed: Sticker[] = []
    for (let i = 0; i < 12; i++) {
      const s = st(`s${i}`)
      const spot = freeSpot(s, placed, ADVENTURE)!
      expect(spot).not.toBeNull()
      const n = { ...s, ...spot }
      expect(n.y).toBeGreaterThan(ADVENTURE.h / 2)
      expect(hits(n, ADVENTURE.keepOut, ADVENTURE)).toEqual([])
      for (const o of placed) expect(overlap(n, o)).toBe(false)
      placed.push(n)
    }
  })

  it('returns null when the lower half is full', () => {
    expect(freeSpot(st('huge', { w: 700 }), [], ADVENTURE)).toBeNull()
  })
})
