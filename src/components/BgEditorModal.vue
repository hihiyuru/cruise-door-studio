<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { assets, addCanvasAsset } from '../stores/assets'
import { ctx2d, trim } from '../render/canvas'
import { edgeSeeds, erode, floodFill } from '../render/floodFill'

const project = useProject()
const ui = useUi()
const el = ref<HTMLCanvasElement>()
const autoBtn = ref<HTMLButtonElement>()
const tol = ref(28)
const global = ref(false)
const undoStack: ImageData[] = []
const busy = ref(false)

const sticker = computed(() => project.byId(ui.editing))

function load(src: HTMLCanvasElement) {
  const c = el.value!
  c.width = src.width
  c.height = src.height
  ctx2d(c).drawImage(src, 0, 0)
}

watch(() => ui.editing, async id => {
  undoStack.length = 0
  if (!id) return
  await nextTick()
  const a = sticker.value && assets.get(sticker.value.assetId)
  if (!a) { ui.editing = null; return }
  load(a.art)
  autoBtn.value?.focus()
})

function push() {
  const c = el.value!
  undoStack.push(ctx2d(c, true).getImageData(0, 0, c.width, c.height))
  if (undoStack.length > 12) undoStack.shift()
}

function onClick(e: MouseEvent) {
  const c = el.value!
  const r = c.getBoundingClientRect()
  const x = Math.floor(((e.clientX - r.left) * c.width) / r.width)
  const y = Math.floor(((e.clientY - r.top) * c.height) / r.height)
  push()
  if (!floodFill(c, [[x, y]], tol.value, global.value)) { undoStack.pop(); ui.notify('那裡已經是透明的了') }
}
function auto() {
  const c = el.value!
  push()
  if (!floodFill(c, edgeSeeds(c.width, c.height), tol.value, false)) { undoStack.pop(); ui.notify('四邊已經是透明的了') }
}
function shave() { push(); erode(el.value!) }
function undo() {
  const u = undoStack.pop()
  if (!u) { ui.notify('沒有上一步了'); return }
  const c = el.value!
  c.width = u.width
  c.height = u.height
  ctx2d(c).putImageData(u, 0, 0)
}
function reset() {
  const a = sticker.value && assets.get(sticker.value.origAssetId)
  if (!a) return
  push()
  load(a.art)
}
function close() { ui.editing = null }

async function apply() {
  const s = sticker.value
  const before = s && assets.get(s.assetId)
  if (!s || !before) return
  const t = trim(el.value!)
  if (!t) { ui.notify('整張都去掉了，按「上一步」或調低容許度'); return }
  busy.value = true
  try {
    const a = await addCanvasAsset(t)
    // keep the artwork's physical scale: same millimetres per pixel as before trimming
    s.w = Math.max(10, (t.width * s.w) / before.art.width)
    s.assetId = a.id
    s.ar = t.height / t.width
    project.commit()
    ui.notify('去背完成', { label: '復原', run: () => project.undo() })
    close()
  } finally {
    busy.value = false
  }
}

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
</script>

<template>
  <div v-if="ui.editing" class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,16,26,.55)] p-4" @pointerdown.self="close" @keydown="onKey">
    <div class="grid max-h-full w-full max-w-[980px] gap-4 overflow-auto rounded-xl bg-surface p-4 md:grid-cols-[minmax(0,1fr)_260px]" role="dialog" aria-modal="true" aria-labelledby="ed-title">
      <div class="checker flex min-h-60 items-center justify-center rounded-lg p-2">
        <canvas ref="el" class="block max-h-[70vh] max-w-full cursor-crosshair" aria-label="點一下要去掉的背景顏色" @click="onClick" />
      </div>
      <div class="flex flex-col gap-3">
        <h2 id="ed-title" class="text-[17px] font-semibold">去背</h2>
        <p class="text-[12.5px] text-muted">點一下要去掉的背景顏色，同色相連的區域就會消失。背景很雜的照片，可以先用 <a class="underline" href="https://www.remove.bg" target="_blank" rel="noopener">remove.bg</a> 去背再上傳。</p>
        <button ref="autoBtn" type="button" class="btn btn-primary" @click="auto">自動去背（從四邊往內）</button>
        <label class="grid grid-cols-[56px_1fr_32px] items-center gap-2"><span class="label">容許度</span>
          <input v-model.number="tol" type="range" min="2" max="80" class="accent-accent" /><span class="num text-right">{{ tol }}</span></label>
        <label class="flex items-center gap-2 text-[13px]"><input v-model="global" type="checkbox" /> 全圖同色都去掉（不只相連的）</label>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" @click="shave">收邊 1px</button>
          <button type="button" class="btn" @click="undo">上一步</button>
          <button type="button" class="btn" @click="reset">回到原圖</button>
        </div>
        <p class="text-[12.5px] text-muted">收邊可以去掉邊緣殘留的白色毛邊。套用時會自動裁掉多餘的透明空白。</p>
        <div class="mt-auto flex justify-end gap-2">
          <button type="button" class="btn" @click="close">取消</button>
          <button type="button" class="btn btn-primary" :disabled="busy" @click="apply">套用</button>
        </div>
      </div>
    </div>
  </div>
</template>
