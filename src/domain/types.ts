/** All lengths are millimetres unless the name says otherwise. */

export interface Sticker {
  id: string
  name: string
  /** Asset currently shown (after background removal); may be a raster PNG or an SVG. */
  assetId: string
  /** Asset as first uploaded, so background removal can be undone. */
  origAssetId: string
  /** Height ÷ width of the visible artwork (transparent margins already trimmed). */
  ar: number
  /** Artwork width, excluding the white border. */
  w: number
  /** Centre position on the door. */
  x: number
  y: number
  /** Degrees, clockwise. */
  rot: number
  /** White border width. */
  border: number
  /** Draw a grey cutting line outside the white border. */
  cut: boolean
  /** Split into overlapping strips when it does not fit on one sheet. */
  tile: boolean
  sample?: boolean
}

export type KeepOut =
  | { name: string; type: 'circle'; cx: number; cy: number; r: number }
  | { name: string; type: 'rect'; x: number; y: number; w: number; h: number }

export interface Rect { x: number; y: number; w: number; h: number }

export type PrintPlace = 'ibon' | 'shop' | 'home'

export interface ProjectState {
  version: 1
  doorId: string
  /** Only used by the custom door. */
  customDoor: { w: number; h: number }
  roomNo: string
  stickers: Sticker[]
  print: {
    place: PrintPlace
    paperId: string
    custom: { w: number; h: number }
    margin: number
    gap: number
  }
  view: { keepOut: boolean; grid: boolean }
}
