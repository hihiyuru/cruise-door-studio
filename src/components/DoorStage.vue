<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Copy, Eraser, MoveDiagonal2, RotateCw, Trash2 } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { bbox, outer, hits } from '../domain/geometry'
import { doorSvg } from '../render/doorSvg'
import StickerCanvas from './StickerCanvas.vue'
import type { Sticker } from '../domain/types'

const project = useProject()
const ui = useUi()
const doorEl = ref<HTMLDivElement>()
const scale = ref(1)
const snapping = ref(false)
const dragging = ref(false)
const selected = computed(() => project.byId(ui.selected))

/* The handles can point anywhere once a sticker is rotated, so the toolbar keeps this much clear of its bounds. */
const HANDLE_CLEAR = 46
const TOOLBAR_H = 38
/** Floating toolbar above the selected sticker, or below it when there is no room above. */
const toolbarStyle = computed(() => {
  const s = selected.value
  if (!s) return {}
  const b = bbox(s)
  const k = scale.value
  const above = b.y * k - HANDLE_CLEAR - TOOLBAR_H
  return { left: `${(b.x + b.w / 2) * k}px`, top: `${above > 4 ? above : (b.y + b.h) * k + HANDLE_CLEAR}px` }
})

function removeSelected() {
  const s = selected.value
  if (!s) return
  const removed = project.remove(s.id)
  ui.selected = null
  if (removed) ui.notify(`已刪除「${removed.name}」。`, { action: { label: '復原', run: () => project.undo() } })
}
function duplicateSelected() {
  const s = selected.value
  const n = s && project.duplicate(s.id, false)
  if (n) ui.selected = n.id
}

/* On phones the settings sheet covers the lower half; bring the chosen sticker into view above it. */
watch(() => ui.selected, async id => {
  if (!id || !matchMedia('(max-width: 767px)').matches) return
  await nextTick()
  const el = doorEl.value?.querySelector<HTMLElement>(`[data-sid="${id}"]`)
  if (el && el.getBoundingClientRect().bottom > innerHeight * 0.45) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
})

const door = computed(() => project.door)
const svg = computed(() => doorSvg(door.value, { keepOut: project.p.view.keepOut, grid: project.p.view.grid, roomNo: project.p.roomNo }))
const aspect = computed(() => `${door.value.w} / ${door.value.h}`)

let ro: ResizeObserver | undefined
onMounted(() => {
  ro = new ResizeObserver(() => { scale.value = (doorEl.value?.clientWidth ?? 0) / door.value.w || 1 })
  ro.observe(doorEl.value!)
})
onBeforeUnmount(() => ro?.disconnect())
watch(() => [door.value.w, door.value.h], () => requestAnimationFrame(() => { scale.value = (doorEl.value?.clientWidth ?? 0) / door.value.w || 1 }))

function boxStyle(s: Sticker) {
  const o = outer(s)
  const k = scale.value
  return {
    left: `${(s.x - o.w / 2) * k}px`,
    top: `${(s.y - o.h / 2) * k}px`,
    width: `${o.w * k}px`,
    height: `${o.h * k}px`,
    transform: `rotate(${s.rot}deg)`,
  }
}
const problems = (s: Sticker) => hits(s, door.value.keepOut, door.value)

/* ---------- dragging: move, resize from the corner, rotate from the top handle ---------- */
type Drag = { mode: 'move' | 'resize' | 'rotate'; s: Sticker; px: number; py: number; x0: number; y0: number; w0: number; d0: number; a0: number; r0: number }
let drag: Drag | null = null

function toMm(e: PointerEvent) {
  const r = doorEl.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / scale.value, y: (e.clientY - r.top) / scale.value }
}

function onDown(e: PointerEvent, s: Sticker, mode: Drag['mode']) {
  if (e.button !== 0) return
  ui.selected = s.id
  const p = toMm(e)
  drag = {
    mode, s, px: p.x, py: p.y, x0: s.x, y0: s.y, w0: s.w,
    d0: Math.hypot(p.x - s.x, p.y - s.y) || 1, a0: Math.atan2(p.y - s.y, p.x - s.x), r0: s.rot,
  }
  dragging.value = true
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  e.preventDefault()
  e.stopPropagation()
}

function onMove(e: PointerEvent) {
  if (!drag) return
  const p = toMm(e)
  const s = drag.s
  if (drag.mode === 'move') {
    let x = drag.x0 + p.x - drag.px
    const snap = !e.shiftKey && Math.abs(x - door.value.w / 2) < 6
    if (snap) x = door.value.w / 2
    snapping.value = snap
    s.x = x
    s.y = drag.y0 + p.y - drag.py
  } else if (drag.mode === 'resize') {
    s.w = Math.max(10, Math.min(door.value.w * 1.5, (drag.w0 * Math.hypot(p.x - s.x, p.y - s.y)) / drag.d0))
  } else {
    let r = drag.r0 + ((Math.atan2(p.y - s.y, p.x - s.x) - drag.a0) * 180) / Math.PI
    r = ((r + 540) % 360) - 180
    if (!e.shiftKey) for (const t of [-180, -90, 0, 90, 180]) if (Math.abs(r - t) < 4) r = t
    s.rot = Math.round(r * 10) / 10
  }
}

function onUp() {
  if (!drag) return
  drag = null
  dragging.value = false
  snapping.value = false
  project.commit()
}

/* ---------- keyboard: arrows move 1 mm (Shift: 1 cm), Delete removes ---------- */
function onKey(e: KeyboardEvent, s: Sticker) {
  const step = e.shiftKey ? 10 : 1
  const mv = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key]
  if (mv) {
    s.x += mv[0]
    s.y += mv[1]
    project.commit()
    e.preventDefault()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    removeSelected()
  } else if (e.key === 'Escape') {
    ui.selected = null
  }
}

</script>

<template>
  <section class="flex min-w-0 flex-col items-center gap-3 py-2" aria-label="艙門">
    <div class="grid max-w-full grid-cols-[auto_auto] gap-x-2 gap-y-1">
      <span />
      <div class="num flex items-center gap-1.5 text-[12px] text-brass before:h-px before:min-w-3 before:flex-1 before:bg-current before:opacity-60 after:h-px after:min-w-3 after:flex-1 after:bg-current after:opacity-60">{{ door.w / 10 }} cm</div>
      <div class="num flex items-center gap-1.5 self-stretch text-[12px] text-brass [writing-mode:vertical-rl] before:w-px before:min-h-3 before:flex-1 before:bg-current before:opacity-60 after:w-px after:min-h-3 after:flex-1 after:bg-current after:opacity-60">{{ door.h / 10 }} cm</div>
      <div
        ref="doorEl"
        class="relative select-none rounded-sm shadow-[0_1px_0_#9c8566,0_10px_30px_rgba(20,34,58,.18)]"
        :style="{ aspectRatio: aspect, height: `min(78vh, 920px, calc((100vw - 110px) * ${door.h / door.w}))` }"
        @pointerdown.self="ui.selected = null"
        @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"
      >
        <svg class="pointer-events-none absolute inset-0 h-full w-full" :viewBox="`0 0 ${door.w} ${door.h}`" aria-hidden="true" v-html="svg" />
        <div v-show="snapping" class="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-select" />
        <div
          v-for="s in project.p.stickers" :key="s.id"
          class="sticker absolute cursor-grab touch-none outline-offset-2"
          :class="[
            ui.selected === s.id ? 'outline-[1.5px] outline-select' : ui.hovered === s.id ? 'outline-2 outline-select/70' : '',
            problems(s).length ? 'outline-dashed outline-[1.5px] outline-warn' : '',
          ]"
          :data-sid="s.id"
          :style="boxStyle(s)"
          tabindex="0"
          role="button"
          :aria-label="`${s.name}，寬 ${(s.w / 10).toFixed(1)} 公分${problems(s).length ? '，蓋到' + problems(s).join('、') : ''}`"
          :aria-pressed="ui.selected === s.id"
          @pointerdown="onDown($event, s, 'move')"
          @focus="ui.selected = s.id"
          @keydown="onKey($event, s)"
        >
          <StickerCanvas :sticker="s" class="pointer-events-none drop-shadow-[0_1px_1.5px_rgba(0,0,0,.25)]" />
          <template v-if="ui.selected === s.id">
            <span class="handle -right-[13px] -bottom-[13px] cursor-nwse-resize" title="拖曳縮放" @pointerdown="onDown($event, s, 'resize')"><MoveDiagonal2 :size="11" /></span>
            <span class="handle -top-[38px] left-1/2 -ml-[10px] cursor-grab" title="拖曳旋轉" @pointerdown="onDown($event, s, 'rotate')"><RotateCw :size="11" /></span>
            <span class="pointer-events-none absolute -top-[18px] left-1/2 h-[18px] w-0.5 -translate-x-1/2 bg-select" />
          </template>
        </div>

        <div
          v-if="selected && !dragging"
          class="absolute z-20 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-lg border border-line bg-surface p-1 shadow-lg"
          :style="toolbarStyle"
          role="toolbar"
          aria-label="貼紙工具"
          @pointerdown.stop
        >
          <button type="button" class="tool" title="去背" @click="ui.editing = selected.id"><Eraser :size="15" aria-hidden="true" />去背</button>
          <button type="button" class="tool" title="複製一張" @click="duplicateSelected"><Copy :size="15" aria-hidden="true" />複製</button>
          <button type="button" class="tool text-warn" title="刪除（Delete 鍵）" @click="removeSelected"><Trash2 :size="15" aria-hidden="true" />刪除</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "../style.css";
/* 20px handle with an icon, 48px touch target */
.handle {
  @apply absolute z-10 grid h-5 w-5 touch-none place-items-center rounded-full border-2 border-select bg-surface text-select;
}
.handle > svg { pointer-events: none; }
.tool {
  @apply inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] hover:bg-surface-2;
}
.handle::before {
  content: "";
  position: absolute;
  inset: -14px;
}
</style>
