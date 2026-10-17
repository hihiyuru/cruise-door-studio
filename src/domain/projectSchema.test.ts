import { describe, expect, it } from 'vitest'
import { isEmbeddedImage, sanitizeProject } from './projectSchema'
import type { ProjectState } from './types'

const defaults: ProjectState = {
  version: 1, doorId: 'disney-adventure', customDoor: { w: 800, h: 2000 }, roomNo: '99999', stickers: [],
  print: { place: 'ibon', paperId: 'ibon-a3', custom: { w: 210, h: 297 }, margin: 8, gap: 4 },
  view: { keepOut: true, grid: false },
}

describe('sanitizeProject', () => {
  it('keeps a normal project as it is', () => {
    const p = { ...defaults, stickers: [{ id: 'a1', name: '米奇', assetId: 'x1', origAssetId: 'x1', ar: 1.1, w: 120, x: 300, y: 1400, rot: -12, border: 2, cut: false, tile: true }] }
    const out = sanitizeProject(p, defaults)
    expect(out.stickers[0]).toMatchObject({ name: '米奇', w: 120, rot: -12, tile: true, sample: false })
    expect(out.print).toEqual(defaults.print)
  })

  it('drops markup smuggled into door sizes (they end up inside SVG)', () => {
    const out = sanitizeProject({ ...defaults, doorId: 'custom', customDoor: { w: '800"/><image href="x" onerror="alert(1)"/>', h: 2000 } }, defaults)
    expect(out.customDoor.w).toBe(800)
    expect(typeof out.customDoor.w).toBe('number')
  })

  it('caps text, clamps numbers and rejects unknown choices', () => {
    const out = sanitizeProject({
      roomNo: '<script>alert(1)</script>',
      print: { place: 'elsewhere', margin: -5, gap: 1e9, custom: { w: NaN, h: Infinity } },
      stickers: [{ id: 'ok', assetId: 'x', w: Infinity }, { id: 'bad id!', assetId: 'x' }, 'nonsense'],
    }, defaults)
    expect(out.roomNo).toHaveLength(6)
    expect(out.print.place).toBe('ibon')
    expect(out.print.margin).toBe(6)
    expect(out.print.gap).toBe(20)
    expect(out.print.custom).toEqual(defaults.print.custom)
    expect(out.stickers.map(s => s.id)).toEqual(['ok'])
    expect(out.stickers[0].w).toBe(100)
  })

  it('survives garbage', () => {
    for (const junk of [null, 42, 'x', [], { stickers: 'no' }]) expect(sanitizeProject(junk, defaults).stickers).toEqual([])
  })
})

describe('isEmbeddedImage', () => {
  it('accepts embedded pictures only, never a link to fetch', () => {
    expect(isEmbeddedImage('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
    expect(isEmbeddedImage('data:image/svg+xml;base64,PHN2Zz4=')).toBe(true)
    expect(isEmbeddedImage('http://attacker.example/beacon')).toBe(false)
    expect(isEmbeddedImage('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isEmbeddedImage(undefined)).toBe(false)
  })
})
