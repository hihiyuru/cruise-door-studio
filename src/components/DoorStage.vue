<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'
import { useStickerDrag } from '../composables/useStickerDrag'
import { doorSvg } from '../render/doorSvg'
import DoorStageSticker from './DoorStageSticker.vue'
import DoorStageToolbar from './DoorStageToolbar.vue'

/** The door at true proportion, with every sticker on it. */
const project = useProject()
const ui = useUi()
const { m } = storeToRefs(useLocale())

/** On phones the settings sheet covers everything below this share of the screen. */
const SHEET_TOP = 0.45
const PHONE_QUERY = '(max-width: 767px)'

const doorEl = ref<HTMLDivElement>()
/** Screen pixels per millimetre of door. */
const scale = ref(1)
const { isDragging, isSnapped, begin, onMove, onUp } = useStickerDrag(doorEl, scale)

const door = computed(() => project.door)
const selected = computed(() => project.byId(ui.selected))
const svg = computed(() => doorSvg(door.value, { keepOut: project.state.view.keepOut, grid: project.state.view.grid, roomNo: project.state.roomNo }))
const doorStyle = computed(() => ({
  aspectRatio: `${door.value.w} / ${door.value.h}`,
  height: `min(78vh, 920px, calc((100vw - 110px) * ${door.value.h / door.value.w}))`,
}))
const toolbarSticker = computed(() => (isDragging.value ? undefined : selected.value))

function measure() {
  scale.value = (doorEl.value?.clientWidth ?? 0) / door.value.w || 1
}

watch(() => [door.value.w, door.value.h], () => requestAnimationFrame(measure))
// bring a sticker chosen from the list into view above the phone settings sheet
watch(() => ui.selected, async id => {
  if (!id || !matchMedia(PHONE_QUERY).matches) return
  await nextTick()
  const el = doorEl.value?.querySelector<HTMLElement>(`[data-sid="${id}"]`)
  if (el && el.getBoundingClientRect().bottom > innerHeight * SHEET_TOP) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
})

let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(doorEl.value!)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section
    class="flex min-w-0 flex-col items-center gap-3 py-2"
    :aria-label="m.door.stage"
  >
    <div class="grid max-w-full grid-cols-[auto_auto] gap-x-2 gap-y-1">
      <span />
      <div class="dimension dimension-across">
        {{ door.w / 10 }} cm
      </div>
      <div class="dimension dimension-down">
        {{ door.h / 10 }} cm
      </div>
      <div
        ref="doorEl"
        class="relative select-none rounded-sm shadow-[0_1px_0_#9c8566,0_10px_30px_rgba(20,34,58,.18)]"
        :style="doorStyle"
        @pointerdown.self="ui.selected = null"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <!-- doorSvg builds this markup from our own door data only -->
        <svg
          class="pointer-events-none absolute inset-0 h-full w-full"
          :viewBox="`0 0 ${door.w} ${door.h}`"
          aria-hidden="true"
          v-html="svg"
        />
        <div
          v-show="isSnapped"
          class="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-select"
        />
        <DoorStageSticker
          v-for="s in project.state.stickers"
          :key="s.id"
          :sticker="s"
          :scale="scale"
          @grab="(e, mode) => begin(e, s, mode)"
        />
        <DoorStageToolbar
          v-if="toolbarSticker"
          :sticker="toolbarSticker"
          :scale="scale"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "../style.css";
/* measurement label with a line either side: across the top of the door, and down its side */
.dimension {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--brass);
}
.dimension::before,
.dimension::after {
  content: "";
  flex: 1;
  background: currentColor;
  opacity: 0.6;
}
.dimension-across::before,
.dimension-across::after { height: 1px; min-width: 0.75rem; }
.dimension-down { align-self: stretch; writing-mode: vertical-rl; }
.dimension-down::before,
.dimension-down::after { width: 1px; min-height: 0.75rem; }
</style>
