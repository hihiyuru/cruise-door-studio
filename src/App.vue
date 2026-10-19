<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useProject } from './stores/project'
import { useUi } from './stores/ui'
import { useLocale } from './stores/locale'
import AppTopBar from './components/AppTopBar.vue'
import SaveBanner from './components/SaveBanner.vue'
import ArrangeStep from './components/ArrangeStep.vue'
import PrintStep from './components/PrintStep.vue'
import BackgroundEditorModal from './components/BackgroundEditorModal.vue'
import AppToast from './components/AppToast.vue'

const project = useProject()
const ui = useUi()
const { m } = storeToRefs(useLocale())
const ready = ref(false)

const typing = () => /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')

function onKey(e: KeyboardEvent) {
  if (ui.editing || typing()) return
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    const ok = e.shiftKey ? project.redo() : project.undo()
    if (!ok) ui.notify(e.shiftKey ? m.value.app.nothingToRedo : m.value.app.nothingToUndo)
    else if (ui.selected && !project.byId(ui.selected)) ui.selected = null
  }
}

onMounted(async () => {
  const { lost } = await project.load()
  if (lost) ui.fail(m.value.app.lostPictures(lost))
  ready.value = true
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="min-h-dvh px-4 pb-10 pt-3">
    <AppTopBar />
    <SaveBanner />
    <main class="mx-auto mt-5 max-w-[1500px]">
      <p
        v-if="!ready"
        class="py-20 text-center text-muted"
      >
        {{ m.app.loading }}
      </p>
      <ArrangeStep v-else-if="ui.step === 'arrange'" />
      <PrintStep v-else />
    </main>
    <footer class="mx-auto mt-10 max-w-[1500px] border-t border-line pt-3 text-[12px] text-muted">
      {{ m.app.footer }}
    </footer>
    <BackgroundEditorModal />
    <AppToast />
  </div>
</template>
