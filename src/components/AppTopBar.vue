<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ChevronDown, Printer, Redo2, Undo2 } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useUndoToast } from '../composables/useUndoToast'
import { importProject, ProjectFileError } from '../storage/projectFile'
import { useBackup } from '../composables/useBackup'
import PrintSpecPicker from './PrintSpecPicker.vue'

const project = useProject()
const ui = useUi()
const notifyUndoable = useUndoToast()
const { layout } = storeToRefs(project)
const doBackup = useBackup()
const fileInput = ref<HTMLInputElement>()
const menuOpen = ref(false)
const menu = ref<HTMLElement>()

const status = computed(() => {
  switch (project.saveStatus) {
    case 'loading': return ''
    case 'saving': return '儲存中…'
    case 'error': return '無法自動儲存'
    case 'conflict': return '暫停儲存'
    default: {
      const t = project.savedAt
      return t ? `已自動儲存 ${t.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}` : '已自動儲存'
    }
  }
})

const sheetCount = computed(() => layout.value.sheets.length)

async function backup() {
  menuOpen.value = false
  await doBackup()
}

function openFile() {
  menuOpen.value = false
  fileInput.value?.click()
}

async function onOpen(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f) return
  try {
    const { project: p, assets: list } = await importProject(f)
    const { lost } = await project.replaceAll(p, list)
    ui.selected = null
    ui.step = 'arrange'
    if (lost) ui.fail(`已開啟備份，但找不到 ${lost} 張圖，已從門上移除。`)
    else notifyUndoable('已開啟備份。')
  } catch (err) {
    ui.fail(err instanceof ProjectFileError ? err.message : '無法開啟，檔案可能已損毀。')
  }
}

function undo() { if (project.undo() && ui.selected && !project.byId(ui.selected)) ui.selected = null }
function redo() { if (project.redo() && ui.selected && !project.byId(ui.selected)) ui.selected = null }

function onDocClick(e: MouseEvent) { if (menuOpen.value && !menu.value?.contains(e.target as Node)) menuOpen.value = false }
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <header class="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-3">
    <button
      v-if="ui.step === 'print'"
      type="button"
      class="btn btn-quiet -ml-2 !px-2"
      @click="ui.step = 'arrange'"
    >
      <ArrowLeft
        :size="16"
        aria-hidden="true"
      />回到門上
    </button>
    <h1 class="mr-auto text-[17px] font-bold">
      郵輪艙門裝飾工作台
    </h1>

    <span
      class="text-[12.5px]"
      :class="project.saveStatus === 'error' || project.saveStatus === 'conflict' ? 'text-warn' : 'text-muted'"
      aria-live="polite"
    >{{ status }}</span>

    <div class="flex items-center">
      <button
        type="button"
        class="btn btn-quiet !px-2"
        :disabled="!project.canUndo"
        title="復原（⌘Z）"
        aria-label="復原"
        @click="undo"
      >
        <Undo2 :size="17" />
      </button>
      <button
        type="button"
        class="btn btn-quiet !px-2"
        :disabled="!project.canRedo"
        title="重做（⇧⌘Z）"
        aria-label="重做"
        @click="redo"
      >
        <Redo2 :size="17" />
      </button>
    </div>

    <div
      ref="menu"
      class="relative"
    >
      <button
        type="button"
        class="btn"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        @click="menuOpen = !menuOpen"
      >
        備份<ChevronDown
          :size="15"
          aria-hidden="true"
        />
      </button>
      <div
        v-if="menuOpen"
        role="menu"
        class="absolute right-0 z-30 mt-1 w-56 rounded-md border border-line bg-surface p-1 shadow-lg"
      >
        <button
          type="button"
          role="menuitem"
          class="block w-full rounded px-3 py-2 text-left hover:bg-surface-2"
          @click="backup"
        >
          下載備份<span class="block text-[12px] text-muted">排版和圖片存成一個檔案，換電腦也能接著做</span>
        </button>
        <button
          type="button"
          role="menuitem"
          class="block w-full rounded px-3 py-2 text-left hover:bg-surface-2"
          @click="openFile"
        >
          開啟備份<span class="block text-[12px] text-muted">會取代目前的排版，可以復原</span>
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="onOpen"
      >
    </div>

    <PrintSpecPicker v-if="ui.step === 'arrange'" />
    <button
      v-if="ui.step === 'arrange'"
      type="button"
      class="btn btn-primary"
      @click="ui.step = 'print'; ui.selected = null"
    >
      <Printer
        :size="16"
        aria-hidden="true"
      />列印／下載 PDF<span
        v-if="sheetCount"
        class="num opacity-85"
      >（{{ sheetCount }} 張）</span>
    </button>
  </header>
</template>
