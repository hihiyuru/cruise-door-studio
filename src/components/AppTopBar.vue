<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ChevronDown, Printer, Redo2, Undo2 } from 'lucide-vue-next'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'
import { useUndoToast } from '../composables/useUndoToast'
import { importProject, ProjectFileError } from '../storage/projectFile'
import { useBackup } from '../composables/useBackup'
import PrintSpecPicker from './PrintSpecPicker.vue'
import LocalePicker from './LocalePicker.vue'

const project = useProject()
const ui = useUi()
const { m } = storeToRefs(useLocale())
const notifyUndoable = useUndoToast()
const { layout } = storeToRefs(project)
const doBackup = useBackup()
const fileInput = ref<HTMLInputElement>()
const menuOpen = ref(false)
const menu = ref<HTMLElement>()

const status = computed(() => {
  switch (project.saveStatus) {
    case 'loading': return ''
    case 'saving': return m.value.topBar.saving
    case 'error': return m.value.topBar.saveFailed
    case 'conflict': return m.value.topBar.savePaused
    default: {
      const t = project.savedAt
      return t ? m.value.topBar.savedAt(t.toLocaleTimeString(m.value.timeTag, { hour: '2-digit', minute: '2-digit', hour12: false })) : m.value.topBar.saved
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
    if (lost) ui.fail(m.value.backup.openedWithLost(lost))
    else notifyUndoable(m.value.backup.opened)
  } catch (err) {
    console.error(err)
    ui.fail(err instanceof ProjectFileError ? m.value.backup.notBackup : m.value.backup.openFailed)
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
      />{{ m.topBar.back }}
    </button>
    <div class="mr-auto flex items-center gap-1">
      <h1 class="text-[17px] font-bold">
        {{ m.app.title }}
      </h1>
      <LocalePicker />
    </div>

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
        :title="m.topBar.undoTitle"
        :aria-label="m.topBar.undo"
        @click="undo"
      >
        <Undo2 :size="17" />
      </button>
      <button
        type="button"
        class="btn btn-quiet !px-2"
        :disabled="!project.canRedo"
        :title="m.topBar.redoTitle"
        :aria-label="m.topBar.redo"
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
        {{ m.topBar.backup }}<ChevronDown
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
          {{ m.topBar.downloadBackup }}<span class="block text-[12px] text-muted">{{ m.topBar.downloadBackupHint }}</span>
        </button>
        <button
          type="button"
          role="menuitem"
          class="block w-full rounded px-3 py-2 text-left hover:bg-surface-2"
          @click="openFile"
        >
          {{ m.topBar.openBackup }}<span class="block text-[12px] text-muted">{{ m.topBar.openBackupHint }}</span>
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
      />{{ m.topBar.print }}<span
        v-if="sheetCount"
        class="num opacity-85"
      >{{ m.topBar.sheetCount(sheetCount) }}</span>
    </button>
  </header>
</template>
