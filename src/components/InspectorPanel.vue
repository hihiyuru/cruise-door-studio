<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { assets, assetsVersion, isSvgFile } from '../stores/assets'
import { dpiOf, hits, outer, widthToFit } from '../domain/geometry'
import { useLayout } from '../composables/useLayout'
import { paperShortName } from '../domain/papers'

const project = useProject()
const ui = useUi()
const { layout, usable } = useLayout()
const replaceInput = ref<HTMLInputElement>()

const s = computed(() => project.byId(ui.selected))
const size = computed(() => (s.value ? outer(s.value) : null))
const cm = (mm: number) => (mm / 10).toFixed(1).replace(/\.0$/, '')

const dpi = computed(() => {
  void assetsVersion.value
  if (!s.value) return null
  const a = assets.get(s.value.assetId)
  if (!a) return null
  if (a.isSvg) return { text: '向量圖，印多大都清楚', bad: false }
  const d = dpiOf(a.art.width, s.value.w)
  return { text: `約 ${d} dpi・${d >= 250 ? '清楚' : d >= 150 ? '還可以，近看會有點軟' : '太低，印出來會糊'}`, bad: d < 150 }
})

const problems = computed(() => (s.value ? hits(s.value, project.door.keepOut, project.door) : []))
const problemText = computed(() => {
  const zones = problems.value.filter(p => p !== '門外')
  const parts = []
  if (zones.length) parts.push(`蓋到「${zones.join('、')}」，那裡貼了會擋到或被門把刮到`)
  if (problems.value.includes('門外')) parts.push('有一部分超出門外')
  return parts.join('；') + '。'
})

const paperName = computed(() => paperShortName(project.p.print.place, project.paper))
/** How this sticker will print on the current paper. */
const printStatus = computed(() => {
  if (!s.value) return null
  const fitW = widthToFit(s.value, usable.value.w, usable.value.h)
  const split = layout.value.split.find(p => p.sticker.id === s.value!.id)
  if (fitW === null) return { kind: 'ok' as const, text: `${paperName.value} 一張印得下` }
  if (split) return { kind: 'split' as const, text: `${paperName.value} 放不下，會切成 ${split.tile!.n} 塊（${split.tile!.label}-1～${split.tile!.label}-${split.tile!.n}）自己拼`, fitW }
  return { kind: 'big' as const, text: `${paperName.value} 放不下`, fitW }
})

function set<K extends 'w' | 'rot' | 'border'>(key: K, v: number, commit = true) {
  if (!s.value || !Number.isFinite(v)) return
  s.value[key] = v
  if (commit) project.commit()
}
function setWidthCm(v: string) {
  const n = parseFloat(v)
  if (n > 0) set('w', Math.min(project.door.w * 1.5, n * 10))
}
function shrinkToFit() {
  if (!s.value || !printStatus.value || !('fitW' in printStatus.value) || !printStatus.value.fitW) return
  s.value.w = printStatus.value.fitW
  s.value.tile = false
  project.commit()
  ui.notify(`已縮到 ${cm(s.value.w)} cm，一張 ${paperName.value} 印得下`, { label: '復原', run: () => project.undo() })
}

function remove() {
  if (!s.value) return
  const removed = project.remove(s.value.id)
  ui.selected = null
  if (removed) ui.notify(`已刪除「${removed.name}」`, { label: '復原', run: () => project.undo() })
}
function dup(mirror: boolean) {
  if (!s.value) return
  const n = project.duplicate(s.value.id, mirror)
  if (n) ui.selected = n.id
}
function toFront() { if (s.value) project.reorder(s.value.id, project.p.stickers.length) }
function toBack() { if (s.value) project.reorder(s.value.id, 0) }
async function onReplace(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f || !s.value) return
  try {
    await project.replaceArt(s.value.id, f, isSvgFile(f))
    ui.notify('已換圖，位置和大小不變', { label: '復原', run: () => project.undo() })
  } catch {
    ui.notify(`讀不到「${f.name}」，請換成 PNG、JPG 或 SVG`)
  }
}
</script>

<template>
  <section class="panel flex min-w-0 flex-col gap-3" aria-label="貼紙設定">
    <template v-if="!s">
      <h2 class="text-[14px] font-semibold">貼紙設定</h2>
      <p class="text-[13px] text-muted">點門上或清單裡的貼紙來調整。拖曳移動、右下角圓點縮放、上方圓點旋轉；方向鍵微調 1 mm，加 Shift 是 1 cm。</p>
      <p class="note">迪士尼郵輪艙門是金屬門，只能用<b>磁鐵</b>固定。可以印在磁性相紙上，或印好後背面貼軟磁鐵片。</p>
    </template>

    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-[14px] font-semibold">貼紙設定</h2>
        <button type="button" class="btn !px-2 !py-1 lg:hidden" aria-label="收起設定" @click="ui.selected = null">完成</button>
      </div>

      <label class="grid grid-cols-[64px_1fr] items-center gap-2"><span class="label">名稱</span>
        <input class="input" :value="s.name" @change="s.name = ($event.target as HTMLInputElement).value; project.commit()" /></label>
      <label class="grid grid-cols-[64px_1fr_auto] items-center gap-2"><span class="label">寬度</span>
        <input class="input" type="number" min="1" step="0.5" :value="+(s.w / 10).toFixed(1)" @change="setWidthCm(($event.target as HTMLInputElement).value)" /><span class="num">cm</span></label>
      <div class="grid grid-cols-[64px_1fr] items-baseline gap-2"><span class="label">成品</span>
        <span class="num">{{ cm(size!.w) }} × {{ cm(size!.h) }} cm（含白邊）</span></div>
      <div v-if="dpi" class="grid grid-cols-[64px_1fr] items-baseline gap-2"><span class="label">解析度</span>
        <span class="num" :class="dpi.bad ? 'text-warn' : ''">{{ dpi.text }}</span></div>
      <label class="grid grid-cols-[64px_1fr_48px] items-center gap-2"><span class="label">旋轉</span>
        <input type="range" min="-180" max="180" step="1" class="accent-accent" :value="Math.round(s.rot)"
          @input="set('rot', +($event.target as HTMLInputElement).value, false)" @change="project.commit()" />
        <span class="num text-right">{{ Math.round(s.rot) }}°</span></label>
      <label class="grid grid-cols-[64px_1fr_48px] items-center gap-2"><span class="label">白邊</span>
        <input type="range" min="0" max="8" step="0.5" class="accent-accent" :value="s.border"
          @input="set('border', +($event.target as HTMLInputElement).value, false)" @change="project.commit()" />
        <span class="num text-right">{{ s.border }} mm</span></label>
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="s.cut" type="checkbox" @change="project.commit()" /> 外圍加灰色裁切線（手剪比較好對）</label>

      <div v-if="problems.length" class="warnbox">{{ problemText }}</div>

      <div v-if="printStatus" class="rounded-lg border border-line px-3 py-2 text-[12.5px]">
        <div class="mb-0.5 text-[11.5px] font-medium tracking-wide text-brass">印刷</div>
        <p :class="printStatus.kind === 'ok' ? 'text-ok' : 'text-warn'">{{ printStatus.kind === 'ok' ? '✓ ' : '' }}{{ printStatus.text }}</p>
        <template v-if="printStatus.kind !== 'ok'">
          <button v-if="'fitW' in printStatus && printStatus.fitW" type="button" class="btn mt-2 w-full" @click="shrinkToFit">縮到 {{ cm(printStatus.fitW) }} cm，一張印完</button>
          <label class="mt-2 flex items-center gap-2">
            <input v-model="s.tile" type="checkbox" @change="project.commit()" /> 維持大小，切成幾塊自己拼（每塊重疊 1 cm）</label>
        </template>
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary" @click="ui.editing = s.id">去背／修圖</button>
        <button type="button" class="btn" @click="replaceInput?.click()">換圖</button>
        <input ref="replaceInput" type="file" accept="image/*,.svg" class="hidden" @change="onReplace" />
        <button type="button" class="btn" @click="dup(false)">複製一張</button>
        <button type="button" class="btn" title="在門的另一側對稱位置複製一張" @click="dup(true)">對稱複製</button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn" @click="toFront">移到最上層</button>
        <button type="button" class="btn" @click="toBack">移到最下層</button>
        <button type="button" class="btn btn-danger ml-auto" @click="remove">刪除</button>
      </div>
    </template>
  </section>
</template>
