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
  <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
    <section class="panel flex flex-col gap-4" aria-label="印刷設定">
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-[14px] font-semibold">在哪裡印？</legend>
        <label v-for="pl in PLACES" :key="pl.id"
          class="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2"
          :class="pr.place === pl.id ? 'border-accent bg-accent/8' : 'border-line hover:border-accent/60'">
          <input type="radio" name="place" class="mt-1" :checked="pr.place === pl.id" @change="setPlace(pl.id)" />
          <span><span class="block text-[13.5px] font-medium">{{ pl.label }}</span><span class="text-[12px] text-muted">{{ pl.hint }}</span></span>
        </label>
      </fieldset>

      <label class="flex flex-col gap-1.5">
        <span class="text-[14px] font-semibold">紙張</span>
        <select class="input" :value="pr.paperId" @change="pr.paperId = ($event.target as HTMLSelectElement).value; project.commit()">
          <option v-for="p in papers" :key="p.id" :value="p.id">{{ p.label }}</option>
          <option v-if="pr.place === 'shop'" :value="CUSTOM_PAPER_ID">自訂尺寸…</option>
        </select>
      </label>
      <div v-if="pr.place === 'shop' && pr.paperId === CUSTOM_PAPER_ID" class="flex gap-3">
        <label class="flex items-center gap-1"><span class="label">寬</span><input class="input w-20" type="number" :value="pr.custom.w" @change="setCustom('w', ($event.target as HTMLInputElement).value)" /><span class="num">mm</span></label>
        <label class="flex items-center gap-1"><span class="label">高</span><input class="input w-20" type="number" :value="pr.custom.h" @change="setCustom('h', ($event.target as HTMLInputElement).value)" /><span class="num">mm</span></label>
      </div>

      <div class="rounded-lg border border-line p-3">
        <p class="text-[14px]">
          <template v-if="sheets.length">共 <b class="num text-[15px]">{{ sheets.length }}</b> 張 {{ short }}<template v-if="cost">，約 <b class="num text-[15px]">{{ cost }}</b> 元</template></template>
          <template v-else>門上還沒有可以印的貼紙。</template>
        </p>
        <p v-if="cost" class="mt-0.5 text-[12px] text-muted">以 ibon 彩色每張 {{ project.paper.price }} 元估算，實際以門市機台顯示為準。</p>
        <p v-for="sp in layout.split" :key="sp.key" class="mt-1 text-[12.5px] text-muted">「{{ sp.sticker.name }}」切成 {{ sp.tile!.n }} 塊（{{ sp.tile!.label }}-1～{{ sp.tile!.label }}-{{ sp.tile!.n }}），拼的時候後一塊壓在前一塊上，重疊 1 公分對齊再黏。</p>
        <button type="button" class="btn btn-primary mt-3 w-full !py-2.5 !text-[14.5px]" :disabled="!sheets.length || !!busy" @click="downloadPdf">
          {{ busy ?? '下載印刷 PDF' }}
        </button>
        <p v-if="pr.place === 'ibon'" class="mt-1.5 text-[12px] text-muted">ibon 單檔有大小限制，檔案太大時會自動拆成幾個 PDF。</p>
      </div>

      <div v-if="layout.tooBig.length" class="warnbox flex flex-col gap-2">
        <p>下面這些比 {{ short }} 能印的範圍大，現在不會被印出來：</p>
        <div v-for="p in layout.tooBig" :key="p.key" class="flex flex-wrap items-center gap-2">
          <b class="mr-auto">{{ p.sticker.name }}</b>
          <button v-if="widthToFit(p.sticker, usable.w, usable.h)" type="button" class="btn !py-1" @click="shrink(p.sticker.id, widthToFit(p.sticker, usable.w, usable.h)!)">縮到 {{ cm(widthToFit(p.sticker, usable.w, usable.h)!) }} cm</button>
          <button type="button" class="btn !py-1" @click="split(p.sticker.id)">切成幾塊</button>
        </div>
      </div>
      <div v-if="blurry.length" class="warnbox">
        「{{ blurry.map(s => s.name).join('、') }}」原圖解析度不夠，印這麼大會糊（不到 150 dpi）。縮小一點，或換更大張的原圖、向量 SVG。
      </div>

      <div class="note flex flex-col gap-1.5">
        <template v-if="pr.place === 'ibon'">
          <p><b>到 ibon 印的時候：</b>紙張選 A3（或 A4）、彩色。這份 PDF 的頁面就是 ibon 能印的範圍，印出來是實際大小。</p>
          <p>先印 <b>1 張</b>，量底部的 5 公分比例尺，對了再印剩下的。</p>
          <p>用 PDF 原檔就好，不用轉 CMYK。</p>
        </template>
        <template v-else-if="pr.place === 'shop'">
          <p>PDF 是 350 dpi、RGB 色彩。印刷店通常要 CMYK，請店家代轉，顏色可能會比螢幕暗一點。</p>
          <p>紙張邊界至少 6 mm，涵蓋常見的 2～3 mm 出血。請店家照實際大小印，不要縮放。</p>
        </template>
        <template v-else>
          <p>列印時選<b>「實際大小」或「100%」</b>，不要選「符合頁面」。印好量底部的 5 公分比例尺確認。</p>
        </template>
      </div>

      <details class="text-[13px]">
        <summary class="cursor-pointer text-muted">進階：紙張邊界與間距</summary>
        <div class="mt-2 flex flex-wrap gap-4">
          <label class="flex items-center gap-1.5"><span class="label">紙張邊界</span><input class="input w-16" type="number" min="6" max="25" :value="pr.margin" @change="setNum('margin', ($event.target as HTMLInputElement).value, 6, 25)" /><span class="num">mm</span></label>
          <label class="flex items-center gap-1.5"><span class="label">貼紙間距</span><input class="input w-16" type="number" min="0" max="20" :value="pr.gap" @change="setNum('gap', ($event.target as HTMLInputElement).value, 0, 20)" /><span class="num">mm</span></label>
        </div>
      </details>

      <button type="button" class="btn self-start" @click="downloadDoor">下載門的預覽圖（PNG）</button>
    </section>

    <section class="panel min-w-0" aria-label="每一張的預覽">
      <h2 class="mb-3 text-[14px] font-semibold">每一張的預覽</h2>
      <p v-if="!sheets.length" class="text-[13px] text-muted">回到「① 排在門上」加入圖片後，這裡會顯示排好的紙張。</p>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        <SheetPreview v-for="(sh, i) in sheets" :key="i" :sheet="sh" :paper="project.paper" :margin="pr.margin" :index="i"
          :label="`${short} 第 ${i + 1} 張・${sh.length} 塊`" />
      </div>
    </section>
  </div>
</template>
