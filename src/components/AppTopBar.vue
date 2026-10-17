<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { assets } from '../stores/assets'
import { exportProject, importProject, ProjectFileError } from '../storage/projectFile'
import { downloadBlob, stamp } from '../export/download'
import { useLayout } from '../composables/useLayout'

const project = useProject()
const ui = useUi()
const { layout } = useLayout()
const fileInput = ref<HTMLInputElement>()

const status = computed(() => {
  switch (project.saveStatus) {
    case 'loading': return '讀取中…'
    case 'saving': return '儲存中…'
    case 'error': return '沒辦法存在這個瀏覽器，請匯出專案檔備份'
    default: {
      const t = project.savedAt
      return t ? `已自動儲存在這台電腦・${t.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}` : '已自動儲存在這台電腦'
    }
  }
})

const sheetCount = computed(() => layout.value.sheets.length)

async function onExport() {
  const used = new Set(project.p.stickers.flatMap(s => [s.assetId, s.origAssetId]))
  const blob = await exportProject(JSON.parse(JSON.stringify(project.p)), [...assets.values()].filter(a => used.has(a.id)))
  downloadBlob(blob, `艙門裝飾專案-${stamp()}.json`)
  ui.notify('已匯出專案檔，換電腦時用「匯入專案」打開')
}

async function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f) return
  try {
    const { project: p, assets: list } = await importProject(f)
    await project.replaceAll(p, list)
    ui.selected = null
    ui.notify(`已匯入 ${p.stickers.length} 張貼紙`)
  } catch (err) {
    ui.notify(err instanceof ProjectFileError ? err.message : '讀不到這個專案檔，檔案可能損壞了')
  }
}

function undo() { if (project.undo() && ui.selected && !project.byId(ui.selected)) ui.selected = null }
function redo() { if (project.redo() && ui.selected && !project.byId(ui.selected)) ui.selected = null }
</script>

<template>
  <header class="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-5 gap-y-2">
    <h1 class="text-[20px] font-extrabold tracking-tight">郵輪艙門裝飾工作台</h1>

    <nav class="flex rounded-lg border border-line bg-surface p-0.5" aria-label="步驟">
      <button
        v-for="s in ([['arrange', '① 排在門上'], ['print', '② 印出來']] as const)" :key="s[0]" type="button"
        class="rounded-md px-3 py-1.5 text-[13.5px]"
        :class="ui.step === s[0] ? 'bg-accent text-accent-fg font-medium' : 'text-fg hover:bg-surface-2'"
        :aria-current="ui.step === s[0] ? 'step' : undefined"
        @click="ui.step = s[0]"
      >
        {{ s[1] }}<span v-if="s[0] === 'print' && sheetCount" class="num ml-1 opacity-80">（{{ sheetCount }} 張）</span>
      </button>
    </nav>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn" :disabled="!project.canUndo" title="⌘Z" @click="undo">↶ 復原</button>
      <button type="button" class="btn" :disabled="!project.canRedo" title="⇧⌘Z" @click="redo">↷ 重做</button>
    </div>

    <div class="ml-auto flex flex-wrap items-center gap-2">
      <span class="text-[12.5px]" :class="project.saveStatus === 'error' ? 'text-warn' : 'text-muted'">{{ status }}</span>
      <button type="button" class="btn" @click="onExport">匯出專案</button>
      <button type="button" class="btn" @click="fileInput?.click()">匯入專案</button>
      <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onImport" />
    </div>
  </header>
</template>
