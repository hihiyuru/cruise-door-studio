<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'
import { usePrintSettings } from '../composables/usePrintSettings'
import PrintSettingsFields from './PrintSettingsFields.vue'

/** The print setting the arrange screen already measures against, visible and changeable from the top bar. */
const ui = useUi()
const { m } = storeToRefs(useLocale())
const { summary } = usePrintSettings()
const root = ref<HTMLElement>()

function onDocClick(e: MouseEvent) {
  if (ui.specOpen && !root.value?.contains(e.target as Node)) ui.specOpen = false
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') ui.specOpen = false }
onMounted(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) })
</script>

<template>
  <div
    ref="root"
    class="relative"
  >
    <button
      type="button"
      class="btn btn-quiet"
      :aria-expanded="ui.specOpen"
      aria-haspopup="dialog"
      :title="m.printSettings.pickerTitle"
      @click.stop="ui.specOpen = !ui.specOpen"
    >
      <span class="text-muted">{{ m.printSettings.printAt }}</span>{{ summary }}<ChevronDown
        :size="15"
        aria-hidden="true"
      />
    </button>
    <div
      v-if="ui.specOpen"
      role="dialog"
      :aria-label="m.printSettings.pickerTitle"
      class="absolute right-0 z-30 mt-1 w-72 rounded-md border border-line bg-surface p-3 shadow-lg"
    >
      <PrintSettingsFields compact />
    </div>
  </div>
</template>
