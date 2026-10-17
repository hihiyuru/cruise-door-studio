<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { hits } from '../domain/geometry'
import { useAddFiles } from '../composables/useFiles'
import StickerCanvas from './StickerCanvas.vue'

const project = useProject()
const ui = useUi()
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
  ui.notify('已清掉範例', { label: '復原', run: () => project.undo() })
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
  ui.notify(`已清空 ${n} 張貼紙`, { label: '復原', run: () => project.undo() })
}
</script>

<template>
  <section class="panel flex min-w-0 flex-col gap-3" aria-label="貼紙清單">
    <div
      class="flex flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed p-3 text-center"
      :class="over ? 'border-accent bg-surface-2' : 'border-line'"
      @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent.stop="over = false; add($event.dataTransfer?.files)"
    >
      <button type="button" class="btn btn-primary" @click="fileInput?.click()">加入圖片…</button>
      <input ref="fileInput" type="file" accept="image/*,.svg" multiple class="hidden" @change="onPick" />
      <span class="text-[12px] text-muted">PNG、JPG、SVG 都可以。也能直接拖進來，或複製圖片後按 ⌘V 貼上。</span>
    </div>

    <div v-if="hasSamples" class="note">
      門上現在是<b>範例貼紙</b>，可以先拖拖看。
      <button type="button" class="btn mt-2 w-full" @click="clearSamples">清掉範例</button>
    </div>

    <div class="flex items-baseline justify-between">
      <h2 class="text-[14px] font-semibold">貼紙 <span class="num text-muted">{{ project.p.stickers.length }}</span></h2>
      <span class="text-[12px] text-muted">上面的在最上層</span>
    </div>

    <p v-if="!rows.length" class="text-[13px] text-muted">門上還沒有貼紙。按「加入圖片…」開始。</p>
    <ul v-else class="-mx-1 flex max-h-[52vh] flex-col gap-0.5 overflow-y-auto">
      <li v-for="s in rows" :key="s.id">
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-left"
          :class="ui.selected === s.id ? 'bg-accent/12 ring-1 ring-accent' : 'hover:bg-surface-2'"
          :aria-pressed="ui.selected === s.id"
          @click="ui.selected = s.id"
        >
          <span class="checker grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded">
            <StickerCanvas :sticker="s" class="!h-auto max-h-9 !w-auto max-w-9" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px]">{{ s.name }}</span>
            <span class="num text-muted">{{ (s.w / 10).toFixed(1) }} cm 寬</span>
          </span>
          <span v-if="problems(s.id).length" class="shrink-0 text-[12px] text-warn" :title="`蓋到${problems(s.id).join('、')}`">⚠ {{ problems(s.id).includes('門外') ? '門外' : '禁貼區' }}</span>
        </button>
      </li>
    </ul>

    <button v-if="rows.length" type="button" class="btn btn-danger mt-1 self-start" @click="clearAll">
      {{ confirming ? `再按一次，刪掉全部 ${project.p.stickers.length} 張` : '清空全部貼紙' }}
    </button>
  </section>
</template>
