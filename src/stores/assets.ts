import { shallowRef } from 'vue'
import { newId } from '../domain/format'
import { loadImage, toCanvas, trim, canvasToBlob, type Canvas } from '../render/canvas'
import type { StoredAsset } from '../storage/idb'
import type { Artwork, ArtworkLookup } from '../render/artwork'

/** An uploaded picture plus its working raster (transparent margins trimmed). */
export interface Asset extends StoredAsset, Artwork {}

/** Hand pictures to the render and export layers without them importing this store. */
export const lookupArtwork: ArtworkLookup = id => assets.get(id)

const RASTER_MAX = 4000
const SVG_MAX = 3000

/** Images live outside the undoable project state; stickers point at them by id. */
// kept on globalThis so a hot reload during development does not forget the images the project still points at
const g = globalThis as { __cdsAssets?: Map<string, Asset> }
export const assets = (g.__cdsAssets ??= new Map<string, Asset>())
/** Bumped whenever an asset is added, so views can re-render. */
export const assetsVersion = shallowRef(0)


export const isSvgFile = (f: { type: string; name?: string }) => f.type === 'image/svg+xml' || /\.svg$/i.test(f.name ?? '')

async function decode(blob: Blob, isSvg: boolean): Promise<Canvas> {
  const url = URL.createObjectURL(blob)
  try {
    const im = await loadImage(url)
    const c = toCanvas(im, isSvg ? SVG_MAX : RASTER_MAX, isSvg)
    return trim(c) ?? c
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function addAsset(blob: Blob, isSvg: boolean, id = newId()): Promise<Asset> {
  const art = await decode(blob, isSvg)
  const a: Asset = { id, blob, isSvg, art }
  assets.set(id, a)
  assetsVersion.value++
  return a
}

/** Store an edited canvas (after background removal) as a new raster asset. */
export async function addCanvasAsset(c: Canvas): Promise<Asset> {
  const blob = await canvasToBlob(c)
  const a: Asset = { id: newId(), blob, isSvg: false, art: c }
  assets.set(a.id, a)
  assetsVersion.value++
  return a
}

export async function restoreAssets(list: StoredAsset[]) {
  await Promise.all(list.map(a => addAsset(a.blob, a.isSvg, a.id).catch(() => null)))
}
