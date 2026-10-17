<script setup lang="ts">
import { computed, ref } from 'vue'
import { ImagePlus, TriangleAlert } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useUndoToast } from '../composables/useUndoToast'
import { hits } from '../domain/geometry'
import { useAddFiles } from '../composables/useFiles'
import StickerCanvas from './StickerCanvas.vue'

const project = useProject()
const ui = useUi()
const notifyUndoable = useUndoToast()
const add = useAddFiles()
const fileInput = ref<HTMLInputElement>()
const over = ref(false)

/** Top layer first, the way design tools list layers. */
const rows = computed(() => [...project.p.stickers].reverse())
const hasSamples = computed(() => project.p.stickers.some(s => s.sample))
const problems = (id: string) => {
  const s = project.byId(id)
  return s ? hits(s, project.door.keepOut, project.door) : []
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  add(input.files)
  input.value = ''
}

function clearSamples() {
  project.p.stickers = project.p.stickers.filter(s => !s.sample)
  ui.selected = null
  project.commit()
  notifyUndoable('已清掉範例。')
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
  const n = project.p.stickers.length
  project.p.stickers = []
  ui.selected = null
  project.commit()
  notifyUndoable(`已清空 ${n} 張。`)
}
</script>

<template>
  <section
    class="flex min-w-0 flex-col gap-3 rounded-md"
    :class="over ? 'bg-surface-2 outline-2 outline-dashed outline-select' : ''"
    aria-label="貼紙清單"
    @dragover.prevent="over = true" @dragleave.self="over = false" @drop.prevent.stop="over = false; add($event.dataTransfer?.files)"
  >
    <button type="button" class="btn btn-primary w-full !py-2" @click="fileInput?.click()">
      <ImagePlus :size="17" aria-hidden="true" />加入圖片
    </button>
    <input ref="fileInput" type="file" accept="image/*,.svg" multiple class="hidden" @change="onPick" />
    <p class="-mt-1 text-[12px] text-muted">PNG、JPG、SVG。也可以拖進來或貼上。</p>

    <div class="mt-2 flex items-baseline justify-between">
      <h2 class="section-title">貼紙 <span class="num font-normal text-muted">{{ project.p.stickers.length }}</span></h2>
      <button v-if="hasSamples" type="button" class="link" @click="clearSamples">清掉範例</button>
    </div>

    <p v-if="!rows.length" class="text-[13px] text-muted">
      門上還沒有貼紙。<button type="button" class="link" @click="project.restoreSamples()">放回範例貼紙</button>
    </p>
    <ul v-else class="-mx-1 flex max-h-[58vh] flex-col overflow-y-auto">
      <li v-for="s in rows" :key="s.id">
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
            <StickerCanvas :sticker="s" class="!h-auto max-h-9 !w-auto max-w-9" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px]">{{ s.name }}</span>
            <span class="num text-[12px] text-muted">寬 {{ (s.w / 10).toFixed(1) }} cm</span>
          </span>
          <TriangleAlert v-if="problems(s.id).length" :size="15" class="shrink-0 text-warn" :aria-label="`蓋到${problems(s.id).join('、')}`" />
        </button>
      </li>
    </ul>

    <button v-if="rows.length" type="button" class="link self-start !text-warn" @click="clearAll">
      {{ confirming ? `再按一次，刪掉全部 ${project.p.stickers.length} 張` : '清空全部貼紙' }}
    </button>
  </section>
</template>
