<script setup lang="ts">
import { computed } from 'vue'
import { Copy, Eraser, Trash2 } from 'lucide-vue-next'
import { useUi } from '../stores/ui'
import { useStickerActions } from '../composables/useStickerActions'
import { bbox } from '../domain/geometry'
import type { Sticker } from '../domain/types'

/** Delete, duplicate and remove background, floating next to the selected sticker. */
const props = defineProps<{
  sticker: Sticker
  /** Screen pixels per millimetre. */
  scale: number
}>()

const ui = useUi()
const { remove, duplicate } = useStickerActions()

/** Rotated stickers can point their handles anywhere, so the toolbar keeps this many pixels clear of the sticker. */
const HANDLE_CLEAR_PX = 46
const TOOLBAR_HEIGHT_PX = 38
/** Smallest room above the sticker before the toolbar moves below it instead. */
const MIN_ROOM_PX = 4

const position = computed(() => {
  const b = bbox(props.sticker)
  const k = props.scale
  const above = b.y * k - HANDLE_CLEAR_PX - TOOLBAR_HEIGHT_PX
  const top = above > MIN_ROOM_PX ? above : (b.y + b.h) * k + HANDLE_CLEAR_PX
  return { left: `${(b.x + b.w / 2) * k}px`, top: `${top}px` }
})
</script>

<template>
  <div
    class="absolute z-20 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-lg border border-line bg-surface p-1 shadow-lg"
    :style="position"
    role="toolbar"
    aria-label="貼紙工具"
    @pointerdown.stop
  >
    <button
      type="button"
      class="tool"
      title="去背"
      @click="ui.editing = sticker.id"
    >
      <Eraser
        :size="15"
        aria-hidden="true"
      />去背
    </button>
    <button
      type="button"
      class="tool"
      title="複製一張"
      @click="duplicate(sticker.id)"
    >
      <Copy
        :size="15"
        aria-hidden="true"
      />複製
    </button>
    <button
      type="button"
      class="tool text-warn"
      title="刪除（Delete 鍵）"
      @click="remove(sticker.id)"
    >
      <Trash2
        :size="15"
        aria-hidden="true"
      />刪除
    </button>
  </div>
</template>

<style scoped>
@reference "../style.css";
.tool {
  @apply inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] hover:bg-surface-2;
}
</style>
