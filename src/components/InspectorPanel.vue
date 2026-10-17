<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, TriangleAlert, X } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { assets, assetsVersion, isSvgFile } from '../stores/assets'
import { dpiOf, hits, outer, widthToFit } from '../domain/geometry'
import { useLayout } from '../composables/useLayout'
import { paperName } from '../domain/papers'

const project = useProject()
const ui = useUi()
const { layout, usable } = useLayout()
const replaceInput = ref<HTMLInputElement>()

const s = computed(() => project.byId(ui.selected))
const size = computed(() => (s.value ? outer(s.value) : null))
const cm = (mm: number) => (mm / 10).toFixed(1).replace(/\.0$/, '')

const ZONE_NAMES: Record<string, string> = { 門牌: '門牌', 貓眼: '貓眼', 門鎖和門把: '門把' }
const paperLabel = computed(() => paperName(project.paper))

/** The one thing worth saying about this sticker, most important first: in the way > blurry > won't fit. */
const status = computed(() => {
  void assetsVersion.value
  const st = s.value
  if (!st) return null
  const hit = hits(st, project.door.keepOut, project.door)
  const zone = hit.find(h => h !== '門外')
  if (zone) return { tone: 'warn' as const, text: `擋到${ZONE_NAMES[zone] ?? zone}了，挪開一點。` }
  if (hit.length) return { tone: 'warn' as const, text: '超出門外了。' }
  const a = assets.get(st.assetId)
  if (a && !a.isSvg && dpiOf(a.art.width, st.w) < 150) return { tone: 'warn' as const, text: '圖太小，印出來會糊。' }
  const fitW = widthToFit(st, usable.value.w, usable.value.h)
  if (fitW === null) return { tone: 'ok' as const, text: `${paperLabel.value} 一張印得完。` }
  const split = layout.value.split.find(p => p.sticker.id === st.id)
  return {
    tone: 'warn' as const,
    text: split ? `${paperLabel.value} 印不下，會分成 ${split.tile!.n} 張印。` : `${paperLabel.value} 印不下。`,
    fitW,
  }
})

function setWidthCm(v: string) {
  const n = parseFloat(v)
  if (!s.value || !(n > 0)) return
  s.value.w = Math.min(project.door.w * 1.5, n * 10)
  project.commit()
}
function shrinkToFit() {
  const fitW = status.value && 'fitW' in status.value ? status.value.fitW : null
  if (!s.value || !fitW) return
  s.value.w = fitW
  s.value.tile = false
  project.commit()
}

function remove() {
  if (!s.value) return
  const removed = project.remove(s.value.id)
  ui.selected = null
  if (removed) ui.notify(`已刪除「${removed.name}」。`, { action: { label: '復原', run: () => project.undo() } })
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
    ui.notify('已換圖。', { action: { label: '復原', run: () => project.undo() } })
  } catch {
    ui.fail(`無法開啟 ${f.name}，改用 JPG 或 PNG。`)
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

    <div v-if="status" class="flex flex-col gap-2 border-t border-line pt-3 text-[13px]">
      <p class="flex items-center gap-1.5" :class="status.tone === 'ok' ? 'text-muted' : 'text-warn'">
        <Check v-if="status.tone === 'ok'" :size="15" class="shrink-0 text-ok" aria-hidden="true" />
        <TriangleAlert v-else :size="15" class="shrink-0" aria-hidden="true" />{{ status.text }}
      </p>
      <template v-if="'fitW' in status && status.fitW">
        <button type="button" class="btn" @click="shrinkToFit">縮到 {{ cm(status.fitW) }} cm</button>
        <label class="flex items-center gap-2">
          <input v-model="s.tile" type="checkbox" @change="project.commit()" />分成幾張印，自己拼</label>
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
