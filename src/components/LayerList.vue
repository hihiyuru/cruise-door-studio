<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { ImagePlus, TriangleAlert } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'
import { useUndoToast } from '../composables/useUndoToast'
import { hits } from '../domain/geometry'
import { useAddFiles } from '../composables/useAddFiles'
import StickerCanvas from './StickerCanvas.vue'

const project = useProject()
const ui = useUi()
const { m } = storeToRefs(useLocale())
const notifyUndoable = useUndoToast()
const add = useAddFiles()
const fileInput = ref<HTMLInputElement>()
const over = ref(false)

/** Top layer first, the way design tools list layers. */
const rows = computed(() => [...project.state.stickers].reverse())
const hasSamples = computed(() => project.state.stickers.some(s => s.sample))
/** Names of the zones a sticker is in the way of, for the warning icon's label; empty when it is fine. */
const problems = (id: string) => {
  const s = project.byId(id)
  return s ? hits(s, project.door.keepOut, project.door).map(z => m.value.door.zones[z]) : []
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  add(input.files)
  input.value = ''
}

function clearSamples() {
  project.state.stickers = project.state.stickers.filter(s => !s.sample)
  ui.selected = null
  project.commit()
  notifyUndoable(m.value.stickers.samplesCleared)
}

let armed: ReturnType<typeof setTimeout> | undefined
const confirming = ref(false)
function clearAll() {
  if (!confirming.value) {
    confirming.value = true
    armed = setTimeout(() => (confirming.value = false), 4000)
    return
  }
  clearTimeout(armed)
  confirming.value = false
  const n = project.state.stickers.length
  project.state.stickers = []
  ui.selected = null
  project.commit()
  notifyUndoable(m.value.stickers.cleared(n))
}
</script>

<template>
  <section
    class="flex min-w-0 flex-col gap-3 rounded-md"
    :class="over ? 'bg-surface-2 outline-2 outline-dashed outline-select' : ''"
    :aria-label="m.stickers.region"
    @dragover.prevent="over = true"
    @dragleave.self="over = false"
    @drop.prevent.stop="over = false; add($event.dataTransfer?.files)"
  >
    <button
      type="button"
      class="btn btn-primary w-full !py-2"
      @click="fileInput?.click()"
    >
      <ImagePlus
        :size="17"
        aria-hidden="true"
      />{{ m.stickers.add }}
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*,.svg"
      multiple
      class="hidden"
      @change="onPick"
    >
    <p class="-mt-1 text-[12px] text-muted">
      {{ m.stickers.addHint }}
    </p>

    <div class="mt-2 flex items-baseline justify-between">
      <h2 class="section-title">
        {{ m.stickers.title }} <span class="num font-normal text-muted">{{ project.state.stickers.length }}</span>
      </h2>
      <button
        v-if="hasSamples"
        type="button"
        class="link"
        @click="clearSamples"
      >
        {{ m.stickers.clearSamples }}
      </button>
    </div>

    <p
      v-if="!rows.length"
      class="text-[13px] text-muted"
    >
      {{ m.stickers.empty }}<button
        type="button"
        class="link"
        @click="project.restoreSamples()"
      >
        {{ m.stickers.restoreSamples }}
      </button>
    </p>
    <ul
      v-else
      class="-mx-1 flex max-h-[58vh] flex-col overflow-y-auto"
    >
      <li
        v-for="s in rows"
        :key="s.id"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left"
          :class="ui.selected === s.id ? 'bg-surface-2 ring-1 ring-select' : 'hover:bg-surface-2'"
          :aria-pressed="ui.selected === s.id"
          @click="ui.selected = s.id"
          @mouseenter="ui.hovered = s.id"
          @mouseleave="ui.hovered = null"
        >
          <span class="checker grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded">
            <StickerCanvas
              :sticker="s"
              class="!h-auto max-h-9 !w-auto max-w-9"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px]">{{ s.name }}</span>
            <span class="num text-[12px] text-muted">{{ m.stickers.width((s.w / 10).toFixed(1)) }}</span>
          </span>
          <TriangleAlert
            v-if="problems(s.id).length"
            :size="15"
            class="shrink-0 text-warn"
            :aria-label="m.stickers.covers(m.list(problems(s.id)))"
          />
        </button>
      </li>
    </ul>

    <button
      v-if="rows.length"
      type="button"
      class="link self-start !text-warn"
      @click="clearAll"
    >
      {{ confirming ? m.stickers.confirmClearAll(project.state.stickers.length) : m.stickers.clearAll }}
    </button>
  </section>
</template>
