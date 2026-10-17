<script setup lang="ts">
import { useUi } from '../stores/ui'
const ui = useUi()

function run() {
  const t = ui.toast
  ui.toast = null
  t?.action?.run()
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4" aria-live="polite">
    <div v-if="ui.toast" :key="ui.toast.id" class="pointer-events-auto flex items-center gap-3 rounded-lg bg-fg px-4 py-2.5 text-[13px] text-bg shadow-lg">
      <span>{{ ui.toast.text }}</span>
      <button v-if="ui.toast.action" type="button" class="font-semibold underline underline-offset-2" @click="run">{{ ui.toast.action.label }}</button>
    </div>
  </div>
</template>
