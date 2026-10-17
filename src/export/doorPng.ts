import type { DoorModel } from '../domain/doors'
import type { Sticker } from '../domain/types'
import { outer } from '../domain/geometry'
import { canvasToBlob, ctx2d, loadImage, mk } from '../render/canvas'
import { doorSvgDocument } from '../render/doorSvg'
import { displayCanvas } from '../render/display'

/** A picture of the decorated door, for keeping a record or sharing. */
export async function doorPreviewPng(door: DoorModel, stickers: Sticker[], roomNo: string): Promise<Blob> {
  const k = 1.4
  const c = mk(door.w * k, door.h * k)
  const x = ctx2d(c)
  const svg = doorSvgDocument(door, { keepOut: false, grid: false, roomNo }, c.width, c.height)
  const im = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
  x.drawImage(im, 0, 0, c.width, c.height)
  for (const s of stickers) {
    const art = displayCanvas(s)
    if (!art) continue
    const o = outer(s)
    x.save()
    x.translate(s.x * k, s.y * k)
    x.rotate((s.rot * Math.PI) / 180)
    x.shadowColor = 'rgba(0,0,0,.25)'
    x.shadowBlur = 3
    x.shadowOffsetY = 1.5
    x.drawImage(art, (-o.w * k) / 2, (-o.h * k) / 2, o.w * k, o.h * k)
    x.restore()
  }
  return canvasToBlob(c)
}
