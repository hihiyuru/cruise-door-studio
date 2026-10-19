<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { Check, Pencil, TriangleAlert, X } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'
import { useUndoToast } from '../composables/useUndoToast'
import { useStickerActions } from '../composables/useStickerActions'
import { assets, assetsVersion, isSvgFile } from '../stores/assets'
import { clampStickerWidth, hits, isBlurry, outer, snapAngle, widthToFit } from '../domain/geometry'
import { formatCm } from '../domain/format'
import { usePrintSettings } from '../composables/usePrintSettings'

const project = useProject()
const ui = useUi()
const { m } = storeToRefs(useLocale())
const { paperName: paperLabel } = usePrintSettings()
const notifyUndoable = useUndoToast()
const actions = useStickerActions()
const { layout, usable } = storeToRefs(project)
const replaceInput = ref<HTMLInputElement>()

const s = computed(() => project.byId(ui.selected))
const size = computed(() => (s.value ? outer(s.value) : null))


/** Where it sits: in the way > off the door > too blurry. Only the most important one is shown. */
const placement = computed(() => {
  void assetsVersion.value
  const st = s.value
  if (!st) return null
  const hit = hits(st, project.door.keepOut, project.door)
  const zone = hit.find(h => h !== 'outside')
  if (zone) return m.value.inspector.inTheWay(m.value.door.zonesShort[zone])
  if (hit.length) return m.value.inspector.offDoor
  const a = assets.get(st.assetId)
  if (a && isBlurry({ isSvg: a.isSvg, pxWidth: a.art.width }, st)) return m.value.inspector.blurry
  return null
})

/** Whether it prints on one sheet. Shown alongside a placement warning, because its fixes are buttons right here. */
const printFit = computed(() => {
  const st = s.value
  if (!st) return null
  const fitW = widthToFit(st, usable.value.w, usable.value.h)
  const t = m.value.inspector
  if (fitW === null) return { ok: true, text: t.fitsOne(paperLabel.value), fitW: null }
  const split = layout.value.split.find(p => p.sticker.id === st.id)
  return { ok: false, text: split ? t.willSplit(paperLabel.value, split.tile!.n) : t.doesNotFit(paperLabel.value), fitW }
})

/** The print line shows when the sticker won't fit, or as the only line when nothing else needs saying. */
const showPrintFit = computed(() => !!printFit.value && (!printFit.value.ok || !placement.value))

/** Rotation slider: settle on upright and quarter turns when close, since those are what people aim for. */
function setRot(v: number) {
  if (!s.value) return
  s.value.rot = snapAngle(v)
}
function straighten() {
  if (!s.value) return
  s.value.rot = 0
  project.commit()
}

function setWidthCm(v: string) {
  const n = parseFloat(v)
  if (!s.value || !(n > 0)) return
  s.value.w = clampStickerWidth(n * 10, project.door.w)
  project.commit()
}
function shrinkToFit() {
  const fitW = printFit.value?.fitW
  if (!s.value || !fitW) return
  s.value.w = fitW
  s.value.tile = false
  project.commit()
}

function onTile() {
  project.commit()
  if (s.value?.tile && !layout.value.split.some(p => p.sticker.id === s.value!.id)) ui.fail(m.value.inspector.tooSmallToSplit)
}

function onRename(e: Event) {
  if (!s.value) return
  s.value.name = (e.target as HTMLInputElement).value
  project.commit()
}
async function onReplace(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f || !s.value) return
  try {
    await project.replaceArt(s.value.id, f, isSvgFile(f))
    notifyUndoable(m.value.inspector.replaced)
  } catch {
    ui.fail(m.value.stickers.cannotOpen(f.name))
  }
}
</script>

<template>
  <section
    v-if="s"
    class="flex min-w-0 flex-col gap-3.5"
    :aria-label="m.inspector.region"
  >
    <div class="flex items-center gap-2">
      <input
        class="input !border-transparent !bg-transparent !px-0 text-[15px] font-semibold hover:!border-line focus:!border-line focus:!px-2"
        :value="s.name"
        :aria-label="m.inspector.name"
        :title="m.inspector.renameTitle"
        @change="onRename"
      >
      <Pencil
        :size="14"
        class="shrink-0 text-muted"
        aria-hidden="true"
      />
      <button
        type="button"
        class="btn btn-quiet shrink-0 !px-1.5"
        :aria-label="m.inspector.deselect"
        @click="ui.selected = null"
      >
        <X :size="17" />
      </button>
    </div>

    <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5">
      <label
        class="label"
        for="ins-w"
      >{{ m.inspector.width }}</label>
      <div class="flex items-center gap-2">
        <input
          id="ins-w"
          class="input num w-20"
          type="number"
          min="1"
          step="0.5"
          :value="+(s.w / 10).toFixed(1)"
          @change="setWidthCm(($event.target as HTMLInputElement).value)"
        >
        <span class="text-[13px]">cm</span>
        <span class="num ml-auto text-[12px] text-muted">{{ m.inspector.finished(formatCm(size!.w), formatCm(size!.h)) }}</span>
      </div>

      <label
        class="label"
        for="ins-rot"
      >{{ m.inspector.rotation }}</label>
      <div class="flex items-center gap-2">
        <input
          id="ins-rot"
          type="range"
          min="-180"
          max="180"
          step="1"
          class="flex-1 accent-accent"
          :value="Math.round(s.rot)"
          @input="setRot(+($event.target as HTMLInputElement).value)"
          @change="project.commit()"
        >
        <span class="num w-10 text-right text-[12.5px]">{{ Math.round(s.rot) }}°</span>
        <button
          v-if="Math.round(s.rot) !== 0"
          type="button"
          class="link shrink-0"
          @click="straighten"
        >
          {{ m.inspector.straighten }}
        </button>
      </div>

      <label
        class="label"
        for="ins-border"
      >{{ m.inspector.border }}</label>
      <div class="flex items-center gap-2">
        <input
          id="ins-border"
          type="range"
          min="0"
          max="8"
          step="0.5"
          class="flex-1 accent-accent"
          :value="s.border"
          @input="s.border = +($event.target as HTMLInputElement).value"
          @change="project.commit()"
        >
        <span class="num w-10 text-right text-[12.5px]">{{ s.border }} mm</span>
      </div>
    </div>

    <label class="flex items-center gap-2 text-[13px]">
      <input
        v-model="s.cut"
        type="checkbox"
        @change="project.commit()"
      >{{ m.inspector.cutLine }}</label>

    <div
      v-if="placement || printFit"
      class="flex flex-col gap-2 border-t border-line pt-3 text-[13px]"
    >
      <p
        v-if="placement"
        class="flex items-center gap-1.5 text-warn"
      >
        <TriangleAlert
          :size="15"
          class="shrink-0"
          aria-hidden="true"
        />{{ placement }}
      </p>
      <p
        v-if="showPrintFit && printFit"
        class="flex items-center gap-1.5"
        :class="printFit.ok ? 'text-muted' : 'text-warn'"
      >
        <Check
          v-if="printFit.ok"
          :size="15"
          class="shrink-0 text-ok"
          aria-hidden="true"
        />
        <TriangleAlert
          v-else
          :size="15"
          class="shrink-0"
          aria-hidden="true"
        />
        <button
          type="button"
          class="text-left underline decoration-dotted underline-offset-2"
          :title="m.inspector.changePrintTitle"
          @click.stop="ui.specOpen = true"
        >
          {{ printFit.text }}
        </button>
      </p>
      <template v-if="printFit?.fitW">
        <button
          type="button"
          class="btn"
          @click="shrinkToFit"
        >
          {{ m.inspector.shrinkTo(formatCm(printFit.fitW)) }}
        </button>
        <label class="flex items-center gap-2">
          <input
            v-model="s.tile"
            type="checkbox"
            @change="onTile"
          >{{ m.inspector.tile }}</label>
      </template>
    </div>

    <div class="flex flex-wrap gap-2 border-t border-line pt-3">
      <button
        type="button"
        class="btn"
        @click="ui.editing = s.id"
      >
        {{ m.inspector.removeBackground }}
      </button>
      <button
        type="button"
        class="btn"
        @click="replaceInput?.click()"
      >
        {{ m.inspector.replace }}
      </button>
      <input
        ref="replaceInput"
        type="file"
        accept="image/*,.svg"
        class="hidden"
        @change="onReplace"
      >
      <button
        type="button"
        class="btn"
        @click="actions.duplicate(s.id)"
      >
        {{ m.inspector.duplicate }}
      </button>
      <button
        type="button"
        class="btn"
        :title="m.inspector.mirrorTitle"
        @click="actions.duplicate(s.id, true)"
      >
        {{ m.inspector.mirror }}
      </button>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="btn"
        @click="project.reorder(s.id, project.state.stickers.length)"
      >
        {{ m.inspector.toTop }}
      </button>
      <button
        type="button"
        class="btn"
        @click="project.reorder(s.id, 0)"
      >
        {{ m.inspector.toBottom }}
      </button>
      <button
        type="button"
        class="btn btn-quiet btn-danger ml-auto"
        @click="actions.remove(s.id)"
      >
        {{ m.inspector.delete }}
      </button>
    </div>
  </section>
</template>
