import { describe, expect, it } from 'vitest'
import { layoutSheets, tilesFor, OVERLAP, TILE_LABEL_MM } from './packing'
import { outer, widthToFit, hits } from './geometry'
import { ADVENTURE } from './doors'
import type { Sticker } from './types'

const st = (id: string, w: number, ar: number, extra: Partial<Sticker> = {}): Sticker => ({
  id, name: id, assetId: id, origAssetId: id, ar, w, x: 365, y: 1500, rot: 0, border: 2, cut: false, tile: false, ...extra,
})

const IBON_A3 = { w: 289, h: 405 }
const usable = (p: { w: number; h: number }, m: number) => [p.w - 2 * m, p.h - 2 * m] as const

/** The shelf packer the first version used, kept here as the baseline to beat. */
function shelfCount(stickers: Sticker[], paper: { w: number; h: number }, m: number, g: number): number {
  const [UW, UH] = usable(paper, m)
  const list = stickers.map(s => {
    const o = outer(s)
    let w = o.w, h = o.h
    if (w > UW || h > UH) { if (h <= UW && w <= UH) [w, h] = [h, w] }
    else if (w > h && w > UW / 2 && h <= UW && w <= UH) [w, h] = [h, w]
    return { w, h }
  }).sort((a, b) => b.h - a.h || b.w - a.w)
  const sheets: { y: number; shelves: { y: number; h: number; x: number }[] }[] = []
  for (const p of list) {
    let done = false
    for (const sh of sheets) {
      for (const shelf of sh.shelves) if (p.h <= shelf.h && shelf.x + p.w <= UW + 0.01) { shelf.x += p.w + g; done = true; break }
      if (done) break
      if (sh.y + p.h <= UH + 0.01) { sh.shelves.push({ y: sh.y, h: p.h, x: p.w + g }); sh.y += p.h + g; done = true; break }
    }
    if (!done) sheets.push({ shelves: [{ y: 0, h: p.h, x: p.w + g }], y: p.h + g })
  }
  return sheets.length
}

describe('layoutSheets', () => {
  // roughly the Halloween set laid out in October 2026: frames, portraits, bats, stars
  const set: Sticker[] = [
    st('mickey', 260, 1.12), st('minnie', 260, 1.04), st('goofy', 220, 1.3), st('pluto', 200, 1.25),
    st('banner', 160, 2.6), st('ghost', 160, 1.4), st('candy1', 180, 1), st('candy2', 140, 1), st('frame', 130, 1.2),
    st('hat', 120, 1.1), ...Array.from({ length: 8 }, (_, i) => st(`bat${i}`, 90, 0.55)),
    ...Array.from({ length: 6 }, (_, i) => st(`star${i}`, 50, 1)),
  ]

  it('never uses more sheets than the old shelf packer', () => {
    for (const paper of [IBON_A3, { w: 210, h: 297 }, { w: 594, h: 841 }]) {
      const got = layoutSheets(set, paper, 8, 4).sheets.length
      expect(got).toBeLessThanOrEqual(shelfCount(set, paper, 8, 4))
    }
  })

  it('keeps every piece inside the printable area without overlaps', () => {
    const { sheets } = layoutSheets(set, IBON_A3, 8, 4)
    for (const sheet of sheets) {
      for (const p of sheet) {
        expect(p.x).toBeGreaterThanOrEqual(8 - 1e-6)
        expect(p.y).toBeGreaterThanOrEqual(8 - 1e-6)
        expect(p.x + p.pw).toBeLessThanOrEqual(IBON_A3.w - 8 + 1e-6)
        expect(p.y + p.ph).toBeLessThanOrEqual(IBON_A3.h - 8 + 1e-6)
      }
      for (let i = 0; i < sheet.length; i++) for (let j = i + 1; j < sheet.length; j++) {
        const a = sheet[i], b = sheet[j]
        const apart = a.x + a.pw + 4 <= b.x + 1e-6 || b.x + b.pw + 4 <= a.x + 1e-6 || a.y + a.ph + 4 <= b.y + 1e-6 || b.y + b.ph + 4 <= a.y + 1e-6
        expect(apart).toBe(true)
      }
    }
  })

  it('places every sticker exactly once', () => {
    const { sheets, tooBig } = layoutSheets(set, IBON_A3, 8, 4)
    expect(sheets.flat().length + tooBig.length).toBe(set.length)
  })

  it('reports stickers that cannot fit when splitting is off', () => {
    const { tooBig } = layoutSheets([st('house', 700, 0.525)], IBON_A3, 8, 4)
    expect(tooBig.map(p => p.key)).toEqual(['house'])
  })
})

describe('tilesFor', () => {
  it('splits the 70 cm haunted house into 3 strips on ibon A3 that add back to the full width', () => {
    const house = st('house', 700, 0.525, { tile: true })
    const [UW, UH] = usable(IBON_A3, 8)
    const strips = tilesFor(house, UW, UH, 'A')!
    expect(strips).toHaveLength(3)
    const o = outer(house)
    const covered = strips.reduce((sum, p) => sum + p.w, 0) - OVERLAP * (strips.length - 1)
    expect(covered).toBeCloseTo(o.w, 6)
    expect(strips.at(-1)!.crop!.x + strips.at(-1)!.w).toBeCloseTo(o.w, 6)
    for (const p of strips) expect((p.w <= UW && p.h + TILE_LABEL_MM <= UH) || (p.h <= UW && p.w + TILE_LABEL_MM <= UH)).toBe(true)
  })
})

describe('tilesFor in both directions', () => {
  it('splits a sticker too wide and too tall for one sheet into a grid that covers it exactly', () => {
    const big = st('big', 700, 0.72, { tile: true }) // about 70 × 50 cm
    const [UW, UH] = usable(IBON_A3, 8)
    const pieces = tilesFor(big, UW, UH, 'A')!
    expect(pieces.length).toBeGreaterThanOrEqual(4)
    const o = outer(big)
    const right = Math.max(...pieces.map(p => p.crop!.x + p.crop!.w))
    const bottom = Math.max(...pieces.map(p => p.crop!.y + p.crop!.h))
    expect(right).toBeCloseTo(o.w, 6)
    expect(bottom).toBeCloseTo(o.h, 6)
    for (const p of pieces) expect((p.w <= UW && p.h + TILE_LABEL_MM <= UH) || (p.h <= UW && p.w + TILE_LABEL_MM <= UH)).toBe(true)
    expect(pieces.map(p => p.tile!.i)).toEqual(pieces.map((_, k) => k + 1))
  })

  it('gets placed on sheets instead of being reported as too big', () => {
    const big = st('big', 700, 0.72, { tile: true })
    const { tooBig, sheets, split } = layoutSheets([big], IBON_A3, 8, 4)
    expect(tooBig).toEqual([])
    expect(split).toHaveLength(1)
    expect(sheets.flat().length).toBe(split[0].tile!.n)
  })
})

describe('split piece labels', () => {
  it('leave room under every split piece so the label never prints on a neighbour, even with no gap', () => {
    const set = [st('house', 700, 0.525, { tile: true }), ...Array.from({ length: 12 }, (_, i) => st(`bat${i}`, 60, 0.55))]
    for (const gap of [0, 1, 4]) {
      const { sheets } = layoutSheets(set, IBON_A3, 8, gap)
      for (const sheet of sheets) for (const t of sheet.filter(p => p.tile)) {
        const labelBox = { x: t.x, y: t.y + t.ph, w: t.pw, h: TILE_LABEL_MM }
        expect(labelBox.y + labelBox.h).toBeLessThanOrEqual(IBON_A3.h - 8 + 1e-6)
        for (const o of sheet) if (o !== t) {
          const apart = o.x >= labelBox.x + labelBox.w - 1e-6 || o.x + o.pw <= labelBox.x + 1e-6 || o.y >= labelBox.y + labelBox.h - 1e-6 || o.y + o.ph <= labelBox.y + 1e-6
          expect(apart).toBe(true)
        }
      }
    }
  })
})

describe('widthToFit', () => {
  it('suggests a width that makes the sticker fit on one sheet', () => {
    const mickey = st('mickey', 330, 1.15)
    const [UW, UH] = usable(IBON_A3, 8)
    const w = widthToFit(mickey, UW, UH)!
    const o = outer({ ...mickey, w })
    expect((o.w <= UW && o.h <= UH) || (o.h <= UW && o.w <= UH)).toBe(true)
    expect(widthToFit({ ...mickey, w: w }, UW, UH)).toBeNull()
  })
})

describe('hits', () => {
  it('flags stickers over the number plate and the lock', () => {
    expect(hits(st('a', 100, 1, { x: 365, y: 260 }), ADVENTURE.keepOut, ADVENTURE)).toContain('門牌')
    expect(hits(st('b', 100, 1, { x: 620, y: 950 }), ADVENTURE.keepOut, ADVENTURE)).toContain('門鎖和門把')
    expect(hits(st('c', 100, 1, { x: 200, y: 1500 }), ADVENTURE.keepOut, ADVENTURE)).toEqual([])
    expect(hits(st('d', 100, 1, { x: 10, y: 1500 }), ADVENTURE.keepOut, ADVENTURE)).toEqual(['門外'])
  })
})
