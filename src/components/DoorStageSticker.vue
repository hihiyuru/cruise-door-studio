<script setup lang="ts">
import { computed } from 'vue'
import { MoveDiagonal2, RotateCw } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useStickerActions } from '../composables/useStickerActions'
import { hits, outer } from '../domain/geometry'
import { formatCm } from '../domain/format'
import type { Sticker } from '../domain/types'
import type { DragMode } from '../composables/useStickerDrag'
import StickerCanvas from './StickerCanvas.vue'

/** One sticker on the door: its picture, outline, handles and keyboard control. */
const props = defineProps<{
  sticker: Sticker
  /** Screen pixels per millimetre. */
  scale: number
}>()
const emit = defineEmits<{ grab: [event: PointerEvent, mode: DragMode] }>()

const project = useProject()
const ui = useUi()
const { remove } = useStickerActions()

/** Keyboard nudge: 1 mm, or 1 cm with Shift. */
const NUDGE_MM = 1
const NUDGE_SHIFT_MM = 10

const isSelected = computed(() => ui.selected === props.sticker.id)
const isHovered = computed(() => ui.hovered === props.sticker.id)
const problems = computed(() => hits(props.sticker, project.door.keepOut, project.door))
const hasProblem = computed(() => problems.value.length > 0)

const outlineClass = computed(() => {
  if (isSelected.value) return 'outline-[1.5px] outline-select'
  if (isHovered.value) return 'outline-2 outline-select/70'
  return ''
})
const boxStyle = computed(() => {
  const s = props.sticker
  const o = outer(s)
  const k = props.scale
  return {
    left: `${(s.x - o.w / 2) * k}px`,
    top: `${(s.y - o.h / 2) * k}px`,
    width: `${o.w * k}px`,
    height: `${o.h * k}px`,
    transform: `rotate(${s.rot}deg)`,
  }
})
const accessibleName = computed(() => {
  const base = `${props.sticker.name}，寬 ${formatCm(props.sticker.w)} 公分`
  return hasProblem.value ? `${base}，蓋到${problems.value.join('、')}` : base
})

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

function onKey(e: KeyboardEvent) {
  const arrow = ARROWS[e.key]
  if (arrow) {
    const step = e.shiftKey ? NUDGE_SHIFT_MM : NUDGE_MM
    props.sticker.x += arrow[0] * step
    props.sticker.y += arrow[1] * step
    project.commit()
    e.preventDefault()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    remove(props.sticker.id)
  } else if (e.key === 'Escape') {
    ui.selected = null
  }
}
</script>

<template>
  <div
    class="sticker absolute cursor-grab touch-none outline-offset-2"
    :class="[outlineClass, { 'outline-dashed outline-[1.5px] outline-warn': hasProblem }]"
    :style="boxStyle"
    :data-sid="sticker.id"
    tabindex="0"
    role="button"
    :aria-label="accessibleName"
    :aria-pressed="isSelected"
    @pointerdown="emit('grab', $event, 'move')"
    @focus="ui.selected = sticker.id"
    @keydown="onKey"
  >
    <StickerCanvas
      :sticker="sticker"
      class="pointer-events-none drop-shadow-[0_1px_1.5px_rgba(0,0,0,.25)]"
    />
    <template v-if="isSelected">
      <span
        class="handle -right-[13px] -bottom-[13px] cursor-nwse-resize"
        title="拖曳縮放"
        @pointerdown="emit('grab', $event, 'resize')"
      ><MoveDiagonal2 :size="11" /></span>
      <span
        class="handle -top-[38px] left-1/2 -ml-[10px] cursor-grab"
        title="拖曳旋轉"
        @pointerdown="emit('grab', $event, 'rotate')"
      ><RotateCw :size="11" /></span>
      <span class="pointer-events-none absolute -top-[18px] left-1/2 h-[18px] w-0.5 -translate-x-1/2 bg-select" />
    </template>
  </div>
</template>

<style scoped>
@reference "../style.css";
/* 20px handle with an icon, 48px touch target */
.handle {
  @apply absolute z-10 grid h-5 w-5 touch-none place-items-center rounded-full border-2 border-select bg-surface text-select;
}
.handle > svg { pointer-events: none; }
.handle::before {
  content: "";
  position: absolute;
  inset: -14px;
}
</style>
