<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useUndoToast } from '../composables/useUndoToast'
import { assets, lookupArtwork } from '../stores/assets'
import { paperName, paperFileName } from '../domain/papers'
import { isBlurry, widthToFit } from '../domain/geometry'
import { formatCm } from '../domain/format'
import { usePrintSettings } from '../composables/usePrintSettings'
import { buildPdfs, MissingArtworkError } from '../export/pdf'
import { doorPreviewPng } from '../export/doorPng'
import { downloadBlob } from '../export/download'
import SheetPreview from './SheetPreview.vue'
import PrintSettingsFields from './PrintSettingsFields.vue'
import { Check, Download } from 'lucide-vue-next'

const project = useProject()
const ui = useUi()
const notifyUndoable = useUndoToast()
const { layout, usable } = storeToRefs(project)
const { pr } = usePrintSettings()

const sheets = computed(() => layout.value.sheets)
const paperLabel = computed(() => paperName(project.paper))
const cost = computed(() => (project.paper.price ? sheets.value.length * project.paper.price : null))

/** Stickers too big for the paper, with the width that would make each fit (null when no width would). */
const oversized = computed(() => layout.value.tooBig.map(p => ({ sticker: p.sticker, fitW: widthToFit(p.sticker, usable.value.w, usable.value.h) })))
const blurryNames = computed(() => blurry.value.map(s => s.name).join('、'))

const blurry = computed(() => project.state.stickers.filter(s => {
  const a = assets.get(s.assetId)
  return a && isBlurry({ isSvg: a.isSvg, pxWidth: a.art.width }, s)
}))

function setNum(key: 'margin' | 'gap', v: string, min: number, max: number) {
  pr.value[key] = Math.max(min, Math.min(max, Math.round(+v || 0)))
  project.commit()
}
function shrink(id: string, w: number) {
  const s = project.byId(id)
  if (!s) return
  s.w = w
  s.tile = false
  project.commit()
  notifyUndoable(`已縮到 ${formatCm(w)} cm。`)
}
function split(id: string) {
  const s = project.byId(id)
  if (!s) return
  s.tile = true
  project.commit()
  const first = layout.value.split.find(p => p.sticker.id === id)
  if (first) notifyUndoable(`已分成 ${first.tile!.n} 張印。`)
  else ui.fail('紙張太小，無法分張印。')
}

/* ---------- output ---------- */
const busy = ref<string | null>(null)
const IBON_MAX_BYTES = 8 * 1024 * 1024

interface Part { blob: Blob; name: string; label: string; done: boolean }
/** When a PDF is split, each part is downloaded by its own click, since browsers block a burst of downloads. */
const parts = ref<Part[]>([])
// a new layout makes any prepared parts stale
watch([sheets, () => project.paper], () => (parts.value = []))

async function downloadPdf() {
  if (!sheets.value.length || busy.value) return
  busy.value = '準備中…'
  parts.value = []
  try {
    const files = await buildPdfs(sheets.value, {
      paper: project.paper,
      margin: pr.value.margin,
      getArtwork: lookupArtwork,
      maxFileBytes: pr.value.place === 'ibon' ? IBON_MAX_BYTES : undefined,
      onProgress: (d, t) => (busy.value = `產生中 ${d} / ${t} 張…`),
    })
    const base = `艙門貼紙_${paperFileName(pr.value.place, project.paper)}_${sheets.value.length}張`
    if (files.length === 1) {
      downloadBlob(files[0].blob, `${base}.pdf`)
      ui.notify('已下載 PDF。')
      return
    }
    parts.value = files.map(f => ({ blob: f.blob, name: `${base}_第${f.from}-${f.to}張.pdf`, label: `第 ${f.from}–${f.to} 張`, done: false }))
    ui.notify(`檔案較大，已分成 ${files.length} 個 PDF。`)
  } catch (e) {
    console.error(e)
    if (e instanceof MissingArtworkError) ui.fail(`找不到「${e.stickerName}」的圖，無法產生 PDF。換圖或刪掉這張再試一次。`)
    else ui.fail('記憶體不足，無法產生 PDF。先縮小最大的幾張。')
  } finally {
    busy.value = null
  }
}

function downloadPart(p: Part) {
  downloadBlob(p.blob, p.name)
  p.done = true
}

async function downloadDoor() {
  try {
    downloadBlob(await doorPreviewPng(project.door, project.state.stickers, project.state.roomNo, lookupArtwork), '艙門預覽.png')
  } catch {
    ui.fail('無法產生預覽圖。')
  }
}
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
    <section class="flex flex-col gap-5" aria-label="印刷設定">
      <PrintSettingsFields />

      <div class="flex flex-col gap-2 border-t border-line pt-4">
        <p v-if="sheets.length" class="text-[15px]">
          共 <b class="num">{{ sheets.length }}</b> 張 {{ paperLabel }}<template v-if="cost">，約 <b class="num">{{ cost }}</b> 元</template>
        </p>
        <p v-else class="text-[13px] text-muted">門上還沒有貼紙。</p>
        <button type="button" class="btn btn-primary w-full !py-2.5 !text-[14.5px]" :disabled="!sheets.length || !!busy" @click="downloadPdf">
          <Download v-if="!busy" :size="17" aria-hidden="true" />{{ busy ?? '下載 PDF' }}
        </button>
        <div v-if="parts.length" class="flex flex-col gap-1.5">
          <p class="text-[12.5px] text-muted">每個都要下載，到 ibon 也要每個都傳。</p>
          <button v-for="p in parts" :key="p.name" type="button" class="btn justify-between" @click="downloadPart(p)">
            <span class="inline-flex items-center gap-1.5"><Download :size="15" aria-hidden="true" />{{ p.label }}</span>
            <span v-if="p.done" class="inline-flex items-center gap-1 text-[12px] text-ok"><Check :size="14" aria-hidden="true" />已下載</span>
          </button>
        </div>
        <p v-if="pr.place === 'ibon'" class="text-[12.5px] text-muted">先印一張，確認比例尺是 5 公分。</p>
        <p v-else-if="pr.place === 'shop'" class="text-[12.5px] text-muted">照實際大小印。需要 CMYK 的話，交給店家轉。</p>
        <p v-else class="text-[12.5px] text-muted">列印時選「實際大小」，不要選「符合頁面」。</p>
      </div>

      <p v-for="sp in layout.split" :key="sp.key" class="text-[12.5px] text-muted">
        「{{ sp.sticker.name }}」分成 {{ sp.tile!.n }} 張印（{{ sp.tile!.label }}-1～{{ sp.tile!.label }}-{{ sp.tile!.n }}），拼的時候疊 1 公分對齊。
      </p>

      <div v-if="oversized.length" class="warnbox flex flex-col gap-2">
        <p>這幾張 {{ paperLabel }} 印不下：</p>
        <div
          v-for="o in oversized"
          :key="o.sticker.id"
          class="flex flex-wrap items-center gap-2"
        >
          <b class="mr-auto">{{ o.sticker.name }}</b>
          <button
            v-if="o.fitW"
            type="button"
            class="btn !py-1"
            @click="shrink(o.sticker.id, o.fitW)"
          >
            縮到 {{ formatCm(o.fitW) }} cm
          </button>
          <button
            type="button"
            class="btn !py-1"
            @click="split(o.sticker.id)"
          >
            分成幾張印
          </button>
        </div>
      </div>
      <p v-if="blurry.length" class="warnbox">
        「{{ blurryNames }}」圖太小，印出來會糊。
      </p>

      <details class="text-[13px]">
        <summary class="cursor-pointer text-muted">紙張邊界與間距</summary>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1"><span class="label">邊界（mm）</span><input class="input num" type="number" min="6" max="25" :value="pr.margin" @change="setNum('margin', ($event.target as HTMLInputElement).value, 6, 25)" /></label>
          <label class="flex flex-col gap-1"><span class="label">間距（mm）</span><input class="input num" type="number" min="0" max="20" :value="pr.gap" @change="setNum('gap', ($event.target as HTMLInputElement).value, 0, 20)" /></label>
        </div>
      </details>

      <button type="button" class="link self-start" @click="downloadDoor">下載整扇門的預覽圖</button>
    </section>

    <section class="min-w-0" aria-label="每一張的預覽">
      <p v-if="!sheets.length" class="text-[13px] text-muted">回到門上加入圖片後，這裡會顯示排好的紙張。</p>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        <SheetPreview v-for="(sh, i) in sheets" :key="i" :sheet="sh" :paper="project.paper" :margin="pr.margin" :index="i"
          :label="`第 ${i + 1} 張`" />
      </div>
    </section>
  </div>
</template>
