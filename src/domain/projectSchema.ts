import type { PrintPlace, ProjectState, Sticker } from './types'

/*
 * A backup file can come from anyone, so nothing in it is trusted. Every field is rebuilt from
 * known-good defaults: numbers must be finite and in range, strings are length-capped, choices
 * must be one of the known values. Anything else falls back to the default or is dropped.
 * Door sizes end up inside SVG markup, so letting a string through here would let a file run script.
 */

const MAX_NAME = 200
const MAX_ROOM_NO = 6
const MAX_STICKERS = 500
const PLACES: PrintPlace[] = ['ibon', 'shop', 'home']

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback)
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback)
/** Ids are only ever produced by us: letters, digits and dashes. */
const id = (v: unknown) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : null)

function sticker(v: unknown): Sticker | null {
  if (!isObj(v)) return null
  const sid = id(v.id)
  const assetId = id(v.assetId)
  if (!sid || !assetId) return null
  return {
    id: sid,
    name: str(v.name, MAX_NAME),
    assetId,
    origAssetId: id(v.origAssetId) ?? assetId,
    ar: num(v.ar, 0.01, 100, 1),
    w: num(v.w, 1, 5000, 100),
    x: num(v.x, -5000, 10000, 0),
    y: num(v.y, -5000, 10000, 0),
    rot: num(v.rot, -180, 180, 0),
    border: num(v.border, 0, 20, 2),
    cut: bool(v.cut),
    tile: bool(v.tile),
    sample: bool(v.sample),
  }
}

/** Turn untrusted data (a backup file, or an old save) into a valid project, starting from `defaults`. */
export function sanitizeProject(raw: unknown, defaults: ProjectState): ProjectState {
  const r = isObj(raw) ? raw : {}
  const door = isObj(r.customDoor) ? r.customDoor : {}
  const print = isObj(r.print) ? r.print : {}
  const custom = isObj(print.custom) ? print.custom : {}
  const view = isObj(r.view) ? r.view : {}
  const place = PLACES.find(p => p === print.place) ?? defaults.print.place
  return {
    version: 1,
    doorId: str(r.doorId, 64, defaults.doorId),
    customDoor: { w: num(door.w, 300, 3000, defaults.customDoor.w), h: num(door.h, 300, 3000, defaults.customDoor.h) },
    roomNo: str(r.roomNo, MAX_ROOM_NO, defaults.roomNo),
    stickers: (Array.isArray(r.stickers) ? r.stickers : []).slice(0, MAX_STICKERS).map(sticker).filter((s): s is Sticker => !!s),
    print: {
      place,
      paperId: str(print.paperId, 64, defaults.print.paperId),
      custom: { w: num(custom.w, 50, 1500, defaults.print.custom.w), h: num(custom.h, 50, 1500, defaults.print.custom.h) },
      margin: num(print.margin, 6, 25, defaults.print.margin),
      gap: num(print.gap, 0, 20, defaults.print.gap),
    },
    view: { keepOut: bool(view.keepOut, defaults.view.keepOut), grid: bool(view.grid, defaults.view.grid) },
  }
}

/** Only pictures embedded in the file itself are accepted, never a link that would be fetched from elsewhere. */
export const isEmbeddedImage = (data: unknown): data is string =>
  typeof data === 'string' && /^data:image\/(png|jpeg|gif|webp|svg\+xml|heic|heif|avif|bmp);base64,/.test(data)
