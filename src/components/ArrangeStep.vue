<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useUi } from '../stores/ui'
import { useAddFiles } from '../composables/useFiles'
import LayerList from './LayerList.vue'
import DoorStage from './DoorStage.vue'
import InspectorPanel from './InspectorPanel.vue'

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
  <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px] md:grid-cols-[minmax(0,1fr)_300px]">
    <LayerList class="order-2 md:order-none md:col-start-2 md:row-start-1 lg:col-start-1" />
    <DoorStage class="order-1 md:order-none md:col-start-1 md:row-span-2 md:row-start-1 lg:col-start-2" />
    <!-- on phones the settings slide up from the bottom once a sticker is selected -->
    <InspectorPanel
      class="md:static md:col-start-2 md:row-start-2 md:max-h-none md:shadow-none lg:col-start-3 lg:row-start-1"
      :class="ui.selected
        ? 'fixed inset-x-0 bottom-0 z-40 max-h-[48vh] overflow-y-auto rounded-b-none pb-[calc(16px+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(0,0,0,.18)]'
        : 'max-md:order-3'"
    />
  </div>
</template>
