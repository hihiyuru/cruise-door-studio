import { loadImage, toCanvas, trim, type Canvas } from './canvas'

/** A sticker's picture as the render and export layers need it; stores hand these in, layers below never look them up. */
export interface Artwork {
  /** Working raster with transparent margins trimmed. */
  art: Canvas
  isSvg: boolean
  /** The original file, so vectors can be re-rendered at print size. */
  blob: Blob
}

export type ArtworkLookup = (assetId: string) => Artwork | undefined

/** Long side of the throwaway render used to find where a vector's visible artwork starts and ends. */
const PROBE_PX = 2000
/** Upper bound for a single vector render, well inside every browser's canvas limits. */
const MAX_VECTOR_PX = 16000

/** Re-render a vector picture so its trimmed width is `targetPx`, for printing. */
export async function svgAtWidth(blob: Blob, targetPx: number): Promise<Canvas> {
  const url = URL.createObjectURL(blob)
  try {
    const im = await loadImage(url)
    const probe = toCanvas(im, PROBE_PX, true)
    const visible = trim(probe) ?? probe
    const hi = toCanvas(im, Math.min(MAX_VECTOR_PX, (PROBE_PX * targetPx) / visible.width), true)
    return trim(hi) ?? hi
  } finally {
    URL.revokeObjectURL(url)
  }
}
