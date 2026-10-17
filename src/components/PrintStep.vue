<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { assets } from '../stores/assets'
import { useLayout } from '../composables/useLayout'
import { PLACES, papersFor, paperShortName, CUSTOM_PAPER_ID } from '../domain/papers'
import { dpiOf, widthToFit } from '../domain/geometry'
import type { PrintPlace } from '../domain/types'
import { buildPdfs } from '../export/pdf'
import { doorPreviewPng } from '../export/doorPng'
import { downloadBlob } from '../export/download'
import SheetPreview from './SheetPreview.vue'
import { Download } from 'lucide-vue-next'

const project = useProject()
const ui = useUi()
const { layout, usable } = useLayout()
const pr = computed(() => project.p.print)

const papers = computed(() => papersFor(pr.value.place))
const sheets = computed(() => layout.value.sheets)
const short = computed(() => paperShortName(pr.value.place, project.paper))
const cost = computed(() => (project.paper.price ? sheets.value.length * project.paper.price : null))
const cm = (mm: number) => (mm / 10).toFixed(1).replace(/\.0$/, '')

const blurry = computed(() => project.p.stickers.filter(s => {
  const a = assets.get(s.assetId)
  return a && !a.isSvg && !s.sample && dpiOf(a.art.width, s.w) < 150
}))

function setPlace(place: PrintPlace) {
  pr.value.place = place
  if (!papersFor(place).some(p => p.id === pr.value.paperId)) pr.value.paperId = papersFor(place)[0].id
  project.commit()
}
function setNum(key: 'margin' | 'gap', v: string, min: number, max: number) {
  pr.value[key] = Math.max(min, Math.min(max, Math.round(+v || 0)))
  project.commit()
}
function setCustom(key: 'w' | 'h', v: string) {
  pr.value.custom[key] = Math.max(50, Math.min(1500, Math.round(+v || 0)))
  project.commit()
}
function shrink(id: string, w: number) {
  const s = project.byId(id)
  if (!s) return
  s.w = w
  s.tile = false
  project.commit()
  ui.notify(`已把「${s.name}」縮到 ${cm(w)} cm`, { label: '復原', run: () => project.undo() })
}
function split(id: string) {
  const s = project.byId(id)
  if (!s) return
  s.tile = true
  project.commit()
}

/* ---------- output ---------- */
const busy = ref<string | null>(null)
const IBON_MAX_BYTES = 8 * 1024 * 1024

async function downloadPdf() {
  if (!sheets.value.length || busy.value) return
  busy.value = `準備中…`
  try {
    const files = await buildPdfs(sheets.value, {
      paper: project.paper,
      margin: pr.value.margin,
      maxFileBytes: pr.value.place === 'ibon' ? IBON_MAX_BYTES : undefined,
      onProgress: (d, t) => (busy.value = `產生中 ${d} / ${t} 張…`),
    })
    const total = sheets.value.length
    for (const f of files) {
      const range = files.length > 1 ? `_第${f.from}-${f.to}張` : ''
      downloadBlob(f.blob, `艙門貼紙_${short.value}_${total}張${range}.pdf`)
    }
    ui.notify(files.length > 1 ? `已下載 ${files.length} 個 PDF（ibon 單檔有大小限制，所以分開）` : '已下載 PDF')
  } catch (e) {
    ui.notify(`PDF 產生失敗：${e instanceof Error ? e.message : '未知原因'}`)
  } finally {
    busy.value = null
  }
}

async function downloadDoor() {
  try {
    downloadBlob(await doorPreviewPng(project.door, project.p.stickers, project.p.roomNo), '艙門預覽.png')
  } catch {
    ui.notify('預覽圖產生失敗')
  }
}
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
    <section class="flex flex-col gap-5" aria-label="印刷設定">
      <div class="flex flex-col gap-2" role="radiogroup" aria-labelledby="place-label">
        <h2 id="place-label" class="section-title">在哪裡印</h2>
        <div class="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
          <button v-for="pl in PLACES" :key="pl.id" type="button" role="radio" :aria-checked="pr.place === pl.id"
            class="rounded px-2 py-1.5 text-[13px]"
            :class="pr.place === pl.id ? 'bg-surface font-medium shadow-sm' : 'text-muted hover:text-fg'"
            @click="setPlace(pl.id)">{{ pl.short }}</button>
        </div>
        <p class="text-[12.5px] text-muted">{{ PLACES.find(p => p.id === pr.place)!.hint }}</p>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="section-title">紙張</span>
        <select class="input" :value="pr.paperId" @change="pr.paperId = ($event.target as HTMLSelectElement).value; project.commit()">
          <option v-for="p in papers" :key="p.id" :value="p.id">{{ p.label }}</option>
          <option v-if="pr.place === 'shop'" :value="CUSTOM_PAPER_ID">自訂尺寸…</option>
        </select>
      </label>
      <div v-if="pr.place === 'shop' && pr.paperId === CUSTOM_PAPER_ID" class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1"><span class="label">寬（mm）</span><input class="input num" type="number" :value="pr.custom.w" @change="setCustom('w', ($event.target as HTMLInputElement).value)" /></label>
        <label class="flex flex-col gap-1"><span class="label">高（mm）</span><input class="input num" type="number" :value="pr.custom.h" @change="setCustom('h', ($event.target as HTMLInputElement).value)" /></label>
      </div>

      <div class="flex flex-col gap-2 border-t border-line pt-4">
        <p v-if="sheets.length" class="text-[15px]">
          共 <b class="num">{{ sheets.length }}</b> 張 {{ short }}<template v-if="cost">，約 <b class="num">{{ cost }}</b> 元</template>
        </p>
        <p v-else class="text-[13px] text-muted">門上還沒有可以印的貼紙。</p>
        <button type="button" class="btn btn-primary w-full !py-2.5 !text-[14.5px]" :disabled="!sheets.length || !!busy" @click="downloadPdf">
          <Download v-if="!busy" :size="17" aria-hidden="true" />{{ busy ?? '下載 PDF' }}
        </button>
        <p v-if="pr.place === 'ibon'" class="text-[12.5px] text-muted">先印 1 張，量紙張底部的 5 公分比例尺，對了再印剩下的。檔案太大時會自動拆成幾個 PDF。</p>
        <p v-else-if="pr.place === 'shop'" class="text-[12.5px] text-muted">350 dpi、RGB。請店家照實際大小印，需要 CMYK 請店家代轉。</p>
        <p v-else class="text-[12.5px] text-muted">列印時選「實際大小」或「100%」，不要選「符合頁面」。</p>
      </div>

      <p v-for="sp in layout.split" :key="sp.key" class="text-[12.5px] text-muted">
        「{{ sp.sticker.name }}」切成 {{ sp.tile!.n }} 塊（{{ sp.tile!.label }}-1～{{ sp.tile!.label }}-{{ sp.tile!.n }}），後一塊壓在前一塊上，重疊 1 公分對齊再黏。
      </p>

      <div v-if="layout.tooBig.length" class="warnbox flex flex-col gap-2">
        <p>這些比 {{ short }} 能印的範圍大，現在不會印出來：</p>
        <div v-for="p in layout.tooBig" :key="p.key" class="flex flex-wrap items-center gap-2">
          <b class="mr-auto">{{ p.sticker.name }}</b>
          <button v-if="widthToFit(p.sticker, usable.w, usable.h)" type="button" class="btn !py-1" @click="shrink(p.sticker.id, widthToFit(p.sticker, usable.w, usable.h)!)">縮到 {{ cm(widthToFit(p.sticker, usable.w, usable.h)!) }} cm</button>
          <button type="button" class="btn !py-1" @click="split(p.sticker.id)">切成幾塊</button>
        </div>
      </div>
      <p v-if="blurry.length" class="warnbox">
        「{{ blurry.map(s => s.name).join('、') }}」解析度不夠，印這麼大會糊。縮小一點，或換更大張的原圖、SVG。
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
