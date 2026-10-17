<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, TriangleAlert, X } from 'lucide-vue-next'
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
  return { text: `${d} dpi，${d >= 250 ? '清楚' : d >= 150 ? '近看會有點軟' : '印出來會糊，請縮小或換大一點的圖'}`, bad: d < 150 }
})

const problems = computed(() => (s.value ? hits(s.value, project.door.keepOut, project.door) : []))
const problemText = computed(() => {
  const zones = problems.value.filter(p => p !== '門外')
  const parts = []
  if (zones.length) parts.push(`蓋到${zones.join('、')}`)
  if (problems.value.includes('門外')) parts.push('超出門外')
  return parts.join('，')
})

const paperName = computed(() => paperShortName(project.p.print.place, project.paper))
/** How this sticker will print on the current paper. */
const printStatus = computed(() => {
  if (!s.value) return null
  const fitW = widthToFit(s.value, usable.value.w, usable.value.h)
  const split = layout.value.split.find(p => p.sticker.id === s.value!.id)
  if (fitW === null) return { ok: true, text: `${paperName.value} 一張印得下`, fitW: null }
  if (split) return { ok: false, text: `${paperName.value} 放不下，會切成 ${split.tile!.n} 塊自己拼`, fitW }
  return { ok: false, text: `${paperName.value} 放不下`, fitW }
})

function setWidthCm(v: string) {
  const n = parseFloat(v)
  if (!s.value || !(n > 0)) return
  s.value.w = Math.min(project.door.w * 1.5, n * 10)
  project.commit()
}
function shrinkToFit() {
  if (!s.value || !printStatus.value?.fitW) return
  s.value.w = printStatus.value.fitW
  s.value.tile = false
  project.commit()
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
  <section v-if="s" class="flex min-w-0 flex-col gap-3.5" aria-label="貼紙設定">
    <div class="flex items-center gap-2">
      <input class="input !border-transparent !bg-transparent !px-0 text-[15px] font-semibold hover:!border-line focus:!border-line focus:!px-2"
        :value="s.name" aria-label="名稱" @change="s.name = ($event.target as HTMLInputElement).value; project.commit()" />
      <button type="button" class="btn btn-quiet shrink-0 !px-1.5" aria-label="取消選取" @click="ui.selected = null"><X :size="17" /></button>
    </div>

    <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5">
      <label class="label" for="ins-w">寬度</label>
      <div class="flex items-center gap-2">
        <input id="ins-w" class="input num w-20" type="number" min="1" step="0.5" :value="+(s.w / 10).toFixed(1)" @change="setWidthCm(($event.target as HTMLInputElement).value)" />
        <span class="text-[13px]">cm</span>
        <span class="num ml-auto text-[12px] text-muted">成品 {{ cm(size!.w) }} × {{ cm(size!.h) }}</span>
      </div>

      <label class="label" for="ins-rot">旋轉</label>
      <div class="flex items-center gap-2">
        <input id="ins-rot" type="range" min="-180" max="180" step="1" class="flex-1 accent-accent" :value="Math.round(s.rot)"
          @input="s.rot = +($event.target as HTMLInputElement).value" @change="project.commit()" />
        <span class="num w-10 text-right text-[12.5px]">{{ Math.round(s.rot) }}°</span>
      </div>

      <label class="label" for="ins-border">白邊</label>
      <div class="flex items-center gap-2">
        <input id="ins-border" type="range" min="0" max="8" step="0.5" class="flex-1 accent-accent" :value="s.border"
          @input="s.border = +($event.target as HTMLInputElement).value" @change="project.commit()" />
        <span class="num w-10 text-right text-[12.5px]">{{ s.border }} mm</span>
      </div>
    </div>

    <label class="flex items-center gap-2 text-[13px]">
      <input v-model="s.cut" type="checkbox" @change="project.commit()" />外圍加灰色裁切線</label>

    <div class="flex flex-col gap-1.5 border-t border-line pt-3 text-[12.5px]">
      <p v-if="problems.length" class="flex items-center gap-1.5 text-warn"><TriangleAlert :size="14" aria-hidden="true" />{{ problemText }}</p>
      <p v-if="dpi" class="flex items-center gap-1.5" :class="dpi.bad ? 'text-warn' : 'text-muted'">
        <TriangleAlert v-if="dpi.bad" :size="14" aria-hidden="true" /><span>{{ dpi.text }}</span></p>
      <p v-if="printStatus" class="flex items-center gap-1.5" :class="printStatus.ok ? 'text-muted' : 'text-warn'">
        <Check v-if="printStatus.ok" :size="14" class="text-ok" aria-hidden="true" /><TriangleAlert v-else :size="14" aria-hidden="true" />{{ printStatus.text }}</p>
      <template v-if="printStatus && !printStatus.ok">
        <button v-if="printStatus.fitW" type="button" class="btn mt-1" @click="shrinkToFit">縮到 {{ cm(printStatus.fitW) }} cm，一張印完</button>
        <label class="flex items-center gap-2 text-[13px]">
          <input v-model="s.tile" type="checkbox" @change="project.commit()" />維持大小，切成幾塊自己拼</label>
      </template>
    </div>

    <div class="flex flex-wrap gap-2 border-t border-line pt-3">
      <button type="button" class="btn" @click="ui.editing = s.id">去背</button>
      <button type="button" class="btn" @click="replaceInput?.click()">換圖</button>
      <input ref="replaceInput" type="file" accept="image/*,.svg" class="hidden" @change="onReplace" />
      <button type="button" class="btn" @click="dup(false)">複製</button>
      <button type="button" class="btn" title="在門的另一側對稱位置複製一張" @click="dup(true)">左右對稱複製</button>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn" @click="project.reorder(s.id, project.p.stickers.length)">移到最上層</button>
      <button type="button" class="btn" @click="project.reorder(s.id, 0)">移到最下層</button>
      <button type="button" class="btn btn-quiet btn-danger ml-auto" @click="remove">刪除</button>
    </div>
  </section>
</template>
