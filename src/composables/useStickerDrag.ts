import { ref, type Ref } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { clampStickerWidth, snapAngle } from '../domain/geometry'
import type { Sticker } from '../domain/types'

export type DragMode = 'move' | 'resize' | 'rotate'

/** A sticker dragged within this distance of the door's centre line snaps onto it (Shift turns snapping off). */
const CENTER_SNAP_MM = 6

interface DragStart {
  mode: DragMode
  sticker: Sticker
  pointer: { x: number; y: number }
  x: number
  y: number
  width: number
  /** Pointer's distance and angle from the sticker centre when the drag began. */
  distance: number
  angle: number
  rotation: number
}

/**
 * Move, resize (corner handle) and rotate (top handle) stickers with the pointer.
 * `scale` is screen pixels per millimetre; positions are worked out in millimetres on the door.
 */
export function useStickerDrag(doorEl: Ref<HTMLElement | undefined>, scale: Ref<number>) {
  const project = useProject()
  const ui = useUi()
  const isDragging = ref(false)
  const isSnapped = ref(false)
  let start: DragStart | null = null

  function toMm(e: PointerEvent) {
    const r = doorEl.value!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / scale.value, y: (e.clientY - r.top) / scale.value }
  }

  function begin(e: PointerEvent, sticker: Sticker, mode: DragMode) {
    if (e.button !== 0) return
    ui.selected = sticker.id
    const p = toMm(e)
    start = {
      mode,
      sticker,
      pointer: p,
      x: sticker.x,
      y: sticker.y,
      width: sticker.w,
      distance: Math.hypot(p.x - sticker.x, p.y - sticker.y) || 1,
      angle: Math.atan2(p.y - sticker.y, p.x - sticker.x),
      rotation: sticker.rot,
    }
    isDragging.value = true
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }

  function onMove(e: PointerEvent) {
    if (!start) return
    const p = toMm(e)
    const s = start.sticker
    if (start.mode === 'move') {
      const centre = project.door.w / 2
      let x = start.x + p.x - start.pointer.x
      isSnapped.value = !e.shiftKey && Math.abs(x - centre) < CENTER_SNAP_MM
      if (isSnapped.value) x = centre
      s.x = x
      s.y = start.y + p.y - start.pointer.y
    } else if (start.mode === 'resize') {
      s.w = clampStickerWidth((start.width * Math.hypot(p.x - s.x, p.y - s.y)) / start.distance, project.door.w)
    } else {
      let deg = start.rotation + ((Math.atan2(p.y - s.y, p.x - s.x) - start.angle) * 180) / Math.PI
      deg = ((deg + 540) % 360) - 180
      if (!e.shiftKey) deg = snapAngle(deg)
      s.rot = Math.round(deg * 10) / 10
    }
  }

  function onUp() {
    if (!start) return
    start = null
    isDragging.value = false
    isSnapped.value = false
    project.commit()
  }

  return { isDragging, isSnapped, begin, onMove, onUp }
}
