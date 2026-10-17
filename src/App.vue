<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useProject } from './stores/project'
import { useUi } from './stores/ui'
import AppTopBar from './components/AppTopBar.vue'
import ArrangeStep from './components/ArrangeStep.vue'
import PrintStep from './components/PrintStep.vue'
import BgEditorModal from './components/BgEditorModal.vue'
import AppToast from './components/AppToast.vue'

const project = useProject()
const ui = useUi()
const ready = ref(false)

const typing = () => /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')

function onKey(e: KeyboardEvent) {
  if (ui.editing || typing()) return
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    const ok = e.shiftKey ? project.redo() : project.undo()
    if (!ok) ui.notify(e.shiftKey ? '沒有可以重做的步驟' : '沒有可以復原的步驟')
    else if (ui.selected && !project.byId(ui.selected)) ui.selected = null
  }
}

onMounted(async () => {
  await project.load()
  ready.value = true
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="min-h-dvh px-4 pb-10 pt-3">
    <AppTopBar />
    <main class="mx-auto mt-3 max-w-[1500px]">
      <p v-if="!ready" class="py-20 text-center text-muted">正在讀取上次的排版…</p>
      <ArrangeStep v-else-if="ui.step === 'arrange'" />
      <PrintStep v-else />
    </main>
    <footer class="mx-auto mt-8 max-w-[1500px] text-[12px] text-muted">
      非迪士尼官方工具。圖片只存在你自己的瀏覽器裡，不會上傳到任何地方。迪士尼郵輪艙門是金屬門，請用磁鐵固定裝飾。
    </footer>
    <BgEditorModal />
    <AppToast />
  </div>
</template>
