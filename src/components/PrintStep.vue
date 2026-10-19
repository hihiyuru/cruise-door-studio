<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'
import { useUndoToast } from '../composables/useUndoToast'
import { assets, lookupArtwork } from '../stores/assets'
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
const { pr, paperName: paperLabel, paperFileName } = usePrintSettings()
const { m } = storeToRefs(useLocale())

const sheets = computed(() => layout.value.sheets)
const cost = computed(() => (project.paper.price ? sheets.value.length * project.paper.price : null))

/** Stickers too big for the paper, with the width that would make each fit (null when no width would). */
const oversized = computed(() => layout.value.tooBig.map(p => ({ sticker: p.sticker, fitW: widthToFit(p.sticker, usable.value.w, usable.value.h) })))
const blurryNames = computed(() => m.value.list(blurry.value.map(s => s.name)))

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
  notifyUndoable(m.value.print.shrunk(formatCm(w)))
}
function split(id: string) {
  const s = project.byId(id)
  if (!s) return
  s.tile = true
  project.commit()
  const first = layout.value.split.find(p => p.sticker.id === id)
  if (first) notifyUndoable(m.value.print.splitDone(first.tile!.n))
  else ui.fail(m.value.print.tooSmallToSplit)
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
  const t = m.value.print
  busy.value = t.preparing
  parts.value = []
  try {
    const files = await buildPdfs(sheets.value, {
      paper: project.paper,
      margin: pr.value.margin,
      getArtwork: lookupArtwork,
      maxFileBytes: pr.value.place === 'ibon' ? IBON_MAX_BYTES : undefined,
      onProgress: (done, total) => (busy.value = t.progress(done, total)),
    })
    const base = t.fileBase(paperFileName.value, sheets.value.length)
    if (files.length === 1) {
      downloadBlob(files[0].blob, `${base}.pdf`)
      ui.notify(t.downloaded)
      return
    }
    parts.value = files.map(f => ({ blob: f.blob, name: t.partFile(base, f.from, f.to), label: t.partLabel(f.from, f.to), done: false }))
    ui.notify(t.splitFiles(files.length))
  } catch (e) {
    console.error(e)
    if (e instanceof MissingArtworkError) ui.fail(t.missingArtwork(e.stickerName))
    else ui.fail(t.outOfMemory)
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
    downloadBlob(await doorPreviewPng(project.door, project.state.stickers, project.state.roomNo, lookupArtwork), m.value.print.doorFile)
  } catch {
    ui.fail(m.value.print.doorFailed)
  }
}
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
    <section
      class="flex flex-col gap-5"
      :aria-label="m.print.region"
    >
      <PrintSettingsFields />

      <div class="flex flex-col gap-2 border-t border-line pt-4">
        <p
          v-if="sheets.length"
          class="text-[15px]"
        >
          {{ m.print.totalBefore }} <b class="num">{{ sheets.length }}</b> {{ m.print.totalSheets(paperLabel) }}<template v-if="cost">
            {{ m.print.costBefore }} <b class="num">{{ cost }}</b> {{ m.print.costAfter }}
          </template>
        </p>
        <p
          v-else
          class="text-[13px] text-muted"
        >
          {{ m.print.empty }}
        </p>
        <button
          type="button"
          class="btn btn-primary w-full !py-2.5 !text-[14.5px]"
          :disabled="!sheets.length || !!busy"
          @click="downloadPdf"
        >
          <Download
            v-if="!busy"
            :size="17"
            aria-hidden="true"
          />{{ busy ?? m.print.download }}
        </button>
        <div
          v-if="parts.length"
          class="flex flex-col gap-1.5"
        >
          <p class="text-[12.5px] text-muted">
            {{ m.print.partsHint }}
          </p>
          <button
            v-for="p in parts"
            :key="p.name"
            type="button"
            class="btn justify-between"
            @click="downloadPart(p)"
          >
            <span class="inline-flex items-center gap-1.5"><Download
              :size="15"
              aria-hidden="true"
            />{{ p.label }}</span>
            <span
              v-if="p.done"
              class="inline-flex items-center gap-1 text-[12px] text-ok"
            ><Check
              :size="14"
              aria-hidden="true"
            />{{ m.print.partDone }}</span>
          </button>
        </div>
        <p
          v-if="pr.place === 'ibon'"
          class="text-[12.5px] text-muted"
        >
          {{ m.print.ibonTip }}
        </p>
        <p
          v-else-if="pr.place === 'shop'"
          class="text-[12.5px] text-muted"
        >
          {{ m.print.shopTip }}
        </p>
        <p
          v-else
          class="text-[12.5px] text-muted"
        >
          {{ m.print.homeTip }}
        </p>
      </div>

      <p
        v-for="sp in layout.split"
        :key="sp.key"
        class="text-[12.5px] text-muted"
      >
        {{ m.print.tiled(sp.sticker.name, sp.tile!.n, sp.tile!.label) }}
      </p>

      <div
        v-if="oversized.length"
        class="warnbox flex flex-col gap-2"
      >
        <p>{{ m.print.tooBig(paperLabel) }}</p>
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
            {{ m.print.shrinkTo(formatCm(o.fitW)) }}
          </button>
          <button
            type="button"
            class="btn !py-1"
            @click="split(o.sticker.id)"
          >
            {{ m.print.split }}
          </button>
        </div>
      </div>
      <p
        v-if="blurry.length"
        class="warnbox"
      >
        {{ m.print.blurry(blurryNames) }}
      </p>

      <details class="text-[13px]">
        <summary class="cursor-pointer text-muted">
          {{ m.print.marginsTitle }}
        </summary>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1"><span class="label">{{ m.print.marginMm }}</span><input
            class="input num"
            type="number"
            min="6"
            max="25"
            :value="pr.margin"
            @change="setNum('margin', ($event.target as HTMLInputElement).value, 6, 25)"
          ></label>
          <label class="flex flex-col gap-1"><span class="label">{{ m.print.gapMm }}</span><input
            class="input num"
            type="number"
            min="0"
            max="20"
            :value="pr.gap"
            @change="setNum('gap', ($event.target as HTMLInputElement).value, 0, 20)"
          ></label>
        </div>
      </details>

      <button
        type="button"
        class="link self-start"
        @click="downloadDoor"
      >
        {{ m.print.downloadDoor }}
      </button>
    </section>

    <section
      class="min-w-0"
      :aria-label="m.print.previewRegion"
    >
      <p
        v-if="!sheets.length"
        class="text-[13px] text-muted"
      >
        {{ m.print.noSheets }}
      </p>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        <SheetPreview
          v-for="(sh, i) in sheets"
          :key="i"
          :sheet="sh"
          :paper="project.paper"
          :margin="pr.margin"
          :index="i"
          :label="m.print.sheetLabel(i + 1)"
        />
      </div>
    </section>
  </div>
</template>
