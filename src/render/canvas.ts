export type Canvas = HTMLCanvasElement

export function mk(w: number, h: number): Canvas {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export const ctx2d = (c: Canvas, read = false) =>
  c.getContext('2d', read ? { willReadFrequently: true } : undefined) as CanvasRenderingContext2D

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = () => reject(new Error('image failed to load'))
    im.src = src
  })
}

const natural = (im: HTMLImageElement | Canvas) => ({
  w: (im as HTMLImageElement).naturalWidth || im.width,
  h: (im as HTMLImageElement).naturalHeight || im.height,
})

/** Draw an image onto a canvas whose long side is at most `max`; vectors may be scaled up. */
export function toCanvas(im: HTMLImageElement | Canvas, max: number, upscale = false): Canvas {
  const n = natural(im)
  const k = Math.min(upscale ? Infinity : 1, max / Math.max(n.w, n.h))
  const c = mk(n.w * k, n.h * k)
  ctx2d(c).drawImage(im, 0, 0, c.width, c.height)
  return c
}

export interface Trimmed extends Canvas { trimX?: number; trimY?: number }

/** Crop away fully transparent margins. Null when the whole image is transparent. */
export function trim(c: Canvas): Trimmed | null {
  const W = c.width
  const H = c.height
  const d = ctx2d(c, true).getImageData(0, 0, W, H).data
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return null
  const out: Trimmed = mk(x1 - x0 + 1, y1 - y0 + 1)
  ctx2d(out).drawImage(c, -x0, -y0)
  out.trimX = x0
  out.trimY = y0
  return out
}

/** Rotate 90° clockwise. */
export function rot90(c: Canvas): Canvas {
  const o = mk(c.height, c.width)
  const x = ctx2d(o)
  x.translate(o.width, 0)
  x.rotate(Math.PI / 2)
  x.drawImage(c, 0, 0)
  return o
}

/** Cut `crop` (in the same units as `size`) out of a canvas that renders `size`. */
export function cropTo(c: Canvas, crop: { x: number; y: number; w: number; h: number }, size: { w: number }): Canvas {
  const k = c.width / size.w
  const out = mk(crop.w * k, crop.h * k)
  ctx2d(out).drawImage(c, -crop.x * k, -crop.y * k)
  return out
}

export function onWhite(c: Canvas): Canvas {
  const out = mk(c.width, c.height)
  const x = ctx2d(out)
  x.fillStyle = '#fff'
  x.fillRect(0, 0, out.width, out.height)
  x.drawImage(c, 0, 0)
  return out
}

export const canvasToBlob = (c: Canvas, type = 'image/png', quality?: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality))
