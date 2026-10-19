<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'
import { useUndoToast } from '../composables/useUndoToast'
import { assets, addCanvasAsset } from '../stores/assets'
import { ctx2d, trim } from '../render/canvas'
import { edgeSeeds, erode, floodFill } from '../render/floodFill'

const project = useProject()
const ui = useUi()
const { m } = storeToRefs(useLocale())
const notifyUndoable = useUndoToast()
const el = ref<HTMLCanvasElement>()
const autoBtn = ref<HTMLButtonElement>()
const tol = ref(28)
const global = ref(false)
const undoStack: ImageData[] = []
/** Edited since opening; leaving by accident would throw the work away. */
const dirty = ref(false)
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
  dirty.value = false
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
  dirty.value = true
}

function onClick(e: MouseEvent) {
  const c = el.value!
  const r = c.getBoundingClientRect()
  const x = Math.floor(((e.clientX - r.left) * c.width) / r.width)
  const y = Math.floor(((e.clientY - r.top) * c.height) / r.height)
  push()
  if (!floodFill(c, [[x, y]], tol.value, global.value)) { undoStack.pop(); ui.notify(m.value.editor.nothingHere) }
}
function auto() {
  const c = el.value!
  push()
  if (!floodFill(c, edgeSeeds(c.width, c.height), tol.value, false)) { undoStack.pop(); ui.notify(m.value.editor.alreadyClean) }
}
function shave() { push(); erode(el.value!) }
function undo() {
  const u = undoStack.pop()
  if (!u) { ui.notify(m.value.editor.nothingToUndo); return }
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
/** Clicking the backdrop or pressing Esc only closes when nothing would be lost. */
function leave() {
  if (dirty.value) ui.notify(m.value.editor.notApplied)
  else close()
}

async function apply() {
  const s = sticker.value
  const before = s && assets.get(s.assetId)
  if (!s || !before) return
  const t = trim(el.value!)
  if (!t) { ui.fail(m.value.editor.allRemoved); return }
  busy.value = true
  try {
    const a = await addCanvasAsset(t)
    // keep the artwork's physical scale: same millimetres per pixel as before trimming
    s.w = Math.max(10, (t.width * s.w) / before.art.width)
    s.assetId = a.id
    s.ar = t.height / t.width
    project.commit()
    notifyUndoable(m.value.editor.applied)
    close()
  } catch (e) {
    console.error(e)
    ui.fail(m.value.editor.applyFailed)
  } finally {
    busy.value = false
  }
}

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') leave() }
</script>

<template>
  <div
    v-if="ui.editing"
    class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,16,26,.55)] p-4"
    @pointerdown.self="leave"
    @keydown="onKey"
  >
    <div
      class="grid max-h-full w-full max-w-[980px] gap-4 overflow-auto rounded-xl bg-surface p-4 md:grid-cols-[minmax(0,1fr)_260px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ed-title"
    >
      <div class="checker flex min-h-60 items-center justify-center rounded-lg p-2">
        <canvas
          ref="el"
          class="block max-h-[70vh] max-w-full cursor-crosshair"
          :aria-label="m.editor.canvas"
          @click="onClick"
        />
      </div>
      <div class="flex flex-col gap-3">
        <h2
          id="ed-title"
          class="text-[17px] font-semibold"
        >
          {{ m.editor.title }}
        </h2>
        <p class="text-[12.5px] text-muted">
          {{ m.editor.hint }}
        </p>
        <button
          ref="autoBtn"
          type="button"
          class="btn btn-primary"
          @click="auto"
        >
          {{ m.editor.auto }}
        </button>
        <label class="grid grid-cols-[56px_1fr_32px] items-center gap-2"><span class="label">{{ m.editor.range }}</span>
          <input
            v-model.number="tol"
            type="range"
            min="2"
            max="80"
            class="accent-accent"
          ><span class="num text-right">{{ tol }}</span></label>
        <label class="flex items-center gap-2 text-[13px]"><input
          v-model="global"
          type="checkbox"
        > {{ m.editor.global }}</label>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn"
            @click="shave"
          >
            {{ m.editor.shave }}
          </button>
          <button
            type="button"
            class="btn"
            @click="undo"
          >
            {{ m.editor.undo }}
          </button>
          <button
            type="button"
            class="btn"
            @click="reset"
          >
            {{ m.editor.reset }}
          </button>
        </div>
        <p class="text-[12.5px] text-muted">
          {{ m.editor.busyPhotoBefore }} <a
            class="underline"
            href="https://www.remove.bg"
            target="_blank"
            rel="noopener"
          >remove.bg</a> {{ m.editor.busyPhotoAfter }}
        </p>
        <div class="mt-auto flex justify-end gap-2">
          <button
            type="button"
            class="btn"
            @click="close"
          >
            {{ m.editor.cancel }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy"
            @click="apply"
          >
            {{ m.editor.apply }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
