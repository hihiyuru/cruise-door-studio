import type { PrintPlace } from './types'

export interface Paper {
  id: string
  w: number
  h: number
  /** Price per colour sheet in NT$, when known. */
  price?: number
}

/**
 * 7-11 ibon scales every page to its printable area, so pages are sized to that area
 * (A3 28.9 × 40.5 cm, A4 20.2 × 28.3 cm) and come out 1:1.
 */
const IBON: Paper[] = [
  { id: 'ibon-a3', w: 289, h: 405, price: 20 },
  { id: 'ibon-a4', w: 202, h: 283, price: 10 },
]

const SHOP: Paper[] = [
  { id: 'a4', w: 210, h: 297 },
  { id: 'a3', w: 297, h: 420 },
  { id: 'a3plus', w: 329, h: 483 },
  { id: 'a2', w: 420, h: 594 },
  { id: 'a1', w: 594, h: 841 },
  { id: 'a0', w: 841, h: 1189 },
  { id: 'b5', w: 182, h: 257 },
  { id: 'b4', w: 257, h: 364 },
]

const HOME: Paper[] = [
  { id: 'a4', w: 210, h: 297 },
  { id: 'letter', w: 216, h: 279 },
  { id: 'a3', w: 297, h: 420 },
]

export const CUSTOM_PAPER_ID = 'custom'

export const PLACES: PrintPlace[] = ['ibon', 'shop', 'home']

export function papersFor(place: PrintPlace): Paper[] {
  return place === 'ibon' ? IBON : place === 'shop' ? SHOP : HOME
}

export function paperFor(place: PrintPlace, id: string, custom: { w: number; h: number }): Paper {
  if (place === 'shop' && id === CUSTOM_PAPER_ID) {
    return { id, w: custom.w, h: custom.h }
  }
  const list = papersFor(place)
  return list.find(p => p.id === id) ?? list[0]
}

/** The plain size name derived from the id: A3, A4, B5, Letter. Translated names (A3 加大, custom) are up to the caller. */
export function standardPaperName(p: Paper): string {
  const base = p.id.replace('ibon-', '')
  return base === 'letter' ? 'Letter' : base.toUpperCase()
}
