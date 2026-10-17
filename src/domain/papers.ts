import type { PrintPlace } from './types'

export interface Paper {
  id: string
  label: string
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
  { id: 'ibon-a3', label: 'A3', w: 289, h: 405, price: 20 },
  { id: 'ibon-a4', label: 'A4', w: 202, h: 283, price: 10 },
]

const SHOP: Paper[] = [
  { id: 'a4', label: 'A4（21 × 29.7 cm）', w: 210, h: 297 },
  { id: 'a3', label: 'A3（29.7 × 42 cm）', w: 297, h: 420 },
  { id: 'a3plus', label: 'A3 加大（32.9 × 48.3 cm）', w: 329, h: 483 },
  { id: 'a2', label: 'A2（42 × 59.4 cm）', w: 420, h: 594 },
  { id: 'a1', label: 'A1（59.4 × 84.1 cm）', w: 594, h: 841 },
  { id: 'a0', label: 'A0（84.1 × 118.9 cm）', w: 841, h: 1189 },
  { id: 'b5', label: 'B5（18.2 × 25.7 cm）', w: 182, h: 257 },
  { id: 'b4', label: 'B4（25.7 × 36.4 cm）', w: 257, h: 364 },
]

const HOME: Paper[] = [
  { id: 'a4', label: 'A4（21 × 29.7 cm）', w: 210, h: 297 },
  { id: 'letter', label: 'Letter（21.6 × 27.9 cm）', w: 216, h: 279 },
  { id: 'a3', label: 'A3（29.7 × 42 cm）', w: 297, h: 420 },
]

export const CUSTOM_PAPER_ID = 'custom'

export const PLACES: { id: PrintPlace; short: string; hint: string }[] = [
  { id: 'ibon', short: '7-11 ibon', hint: '一般紙，A3 彩色一張約 20 元。' },
  { id: 'shop', short: '印刷店', hint: '可以選相紙和大尺寸。' },
  { id: 'home', short: '家用印表機', hint: '以 A4 為主。' },
]

export function papersFor(place: PrintPlace): Paper[] {
  return place === 'ibon' ? IBON : place === 'shop' ? SHOP : HOME
}

export function paperFor(place: PrintPlace, id: string, custom: { w: number; h: number }): Paper {
  if (place === 'shop' && id === CUSTOM_PAPER_ID) {
    return { id, label: `自訂（${custom.w} × ${custom.h} mm）`, w: custom.w, h: custom.h }
  }
  const list = papersFor(place)
  return list.find(p => p.id === id) ?? list[0]
}

/** Name shown to people: A3, A4, A3 加大, or the custom size. */
export function paperName(p: Paper): string {
  if (p.id === CUSTOM_PAPER_ID) return `${p.w} × ${p.h} mm`
  return p.label.replace(/（.*$/, '')
}

/** Short name used in file names. */
export function paperShortName(place: PrintPlace, p: Paper): string {
  if (p.id === CUSTOM_PAPER_ID) return `${p.w}x${p.h}mm`
  const base = p.id.replace('ibon-', '').toUpperCase().replace('A3PLUS', 'A3加大')
  return place === 'ibon' ? `ibon-${base}` : base
}
