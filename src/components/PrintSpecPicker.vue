<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { useUi } from '../stores/ui'
import { usePrintSettings } from '../composables/usePrintSettings'
import { CUSTOM_PAPER_ID, PLACES } from '../domain/papers'

/** The print setting the arrange screen already measures against, visible and changeable from the top bar. */
const ui = useUi()
const { pr, papers, summary, isCustom, setPlace, setPaper, setCustom } = usePrintSettings()
const root = ref<HTMLElement>()

function onDocClick(e: MouseEvent) {
  if (ui.specOpen && !root.value?.contains(e.target as Node)) ui.specOpen = false
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') ui.specOpen = false }
onMounted(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) })
</script>

<template>
  <div ref="root" class="relative">
    <button type="button" class="btn btn-quiet" :aria-expanded="ui.specOpen" aria-haspopup="dialog" title="列印地點與紙張" @click.stop="ui.specOpen = !ui.specOpen">
      <span class="text-muted">印在</span>{{ summary }}<ChevronDown :size="15" aria-hidden="true" />
    </button>
    <div v-if="ui.specOpen" role="dialog" aria-label="列印地點與紙張" class="absolute right-0 z-30 mt-1 flex w-72 flex-col gap-3 rounded-md border border-line bg-surface p-3 shadow-lg">
      <div class="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1" role="radiogroup" aria-label="在哪裡印">
        <button v-for="pl in PLACES" :key="pl.id" type="button" role="radio" :aria-checked="pr.place === pl.id"
          class="rounded px-1 py-1.5 text-[12.5px]"
          :class="pr.place === pl.id ? 'bg-surface font-medium shadow-sm' : 'text-muted hover:text-fg'"
          @click="setPlace(pl.id)">{{ pl.short }}</button>
      </div>
      <label class="flex flex-col gap-1">
        <span class="label">紙張</span>
        <select class="input" :value="pr.paperId" @change="setPaper(($event.target as HTMLSelectElement).value)">
          <option v-for="p in papers" :key="p.id" :value="p.id">{{ p.label }}</option>
          <option v-if="pr.place === 'shop'" :value="CUSTOM_PAPER_ID">自訂尺寸…</option>
        </select>
      </label>
      <div v-if="isCustom" class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1"><span class="label">寬（mm）</span><input class="input num" type="number" :value="pr.custom.w" @change="setCustom('w', ($event.target as HTMLInputElement).value)" /></label>
        <label class="flex flex-col gap-1"><span class="label">高（mm）</span><input class="input num" type="number" :value="pr.custom.h" @change="setCustom('h', ($event.target as HTMLInputElement).value)" /></label>
      </div>
    </div>
  </div>
</template>
