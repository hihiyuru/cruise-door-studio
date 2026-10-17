<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useUi } from '../stores/ui'
import { useAddFiles } from '../composables/useFiles'
import LayerList from './LayerList.vue'
import DoorStage from './DoorStage.vue'
import InspectorPanel from './InspectorPanel.vue'
import DoorSettings from './DoorSettings.vue'

const ui = useUi()
const add = useAddFiles()

function onPaste(e: ClipboardEvent) {
  const files = [...(e.clipboardData?.items ?? [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter((f): f is File => !!f)
  if (files.length) add(files)
}
function onDrop(e: DragEvent) {
  if (!e.dataTransfer?.files.length) return
  e.preventDefault()
  add(e.dataTransfer.files)
}
const onDragOver = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault() }

onMounted(() => {
  document.addEventListener('paste', onPaste)
  document.addEventListener('drop', onDrop)
  document.addEventListener('dragover', onDragOver)
})
onBeforeUnmount(() => {
  document.removeEventListener('paste', onPaste)
  document.removeEventListener('drop', onDrop)
  document.removeEventListener('dragover', onDragOver)
})
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[240px_auto_300px] lg:justify-center lg:gap-x-10">
    <LayerList class="order-2 md:col-start-2 md:row-start-1 lg:order-none lg:col-start-1 lg:border-r lg:border-line lg:pr-5" />
    <DoorStage class="order-1 md:col-start-1 md:row-span-2 md:row-start-1 lg:order-none lg:col-start-2" />
    <div class="order-3 md:col-start-2 md:row-start-2 lg:order-none lg:col-start-3 lg:row-start-1 lg:border-l lg:border-line lg:pl-5">
      <DoorSettings v-if="!ui.selected" />
      <!-- on phones the sticker settings slide up from the bottom -->
      <InspectorPanel
        v-else
        class="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:max-h-[50vh] max-md:overflow-y-auto max-md:rounded-t-xl max-md:border-t max-md:border-line max-md:bg-surface max-md:p-4 max-md:pb-[calc(16px+env(safe-area-inset-bottom,0px))] max-md:shadow-[0_-8px_30px_rgba(0,0,0,.18)]"
      />
    </div>
  </div>
</template>
