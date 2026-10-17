<script setup lang="ts">
import { TriangleAlert, X } from 'lucide-vue-next'
import { useUi } from '../stores/ui'

const ui = useUi()

function run() {
  const t = ui.toast
  ui.dismiss()
  t?.action?.run()
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4">
    <div
      v-if="ui.toast" :key="ui.toast.id"
      class="pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-lg px-4 py-2.5 text-[13.5px] shadow-lg"
      :class="ui.toast.tone === 'error' ? 'border border-warn bg-warn-bg text-warn' : 'bg-fg text-bg'"
      :role="ui.toast.tone === 'error' ? 'alert' : 'status'"
    >
      <TriangleAlert v-if="ui.toast.tone === 'error'" :size="16" class="shrink-0" aria-hidden="true" />
      <span>{{ ui.toast.text }}</span>
      <button v-if="ui.toast.action" type="button" class="shrink-0 font-semibold underline underline-offset-2" @click="run">{{ ui.toast.action.label }}</button>
      <button v-if="ui.toast.tone === 'error'" type="button" class="-mr-1 shrink-0 rounded p-0.5 hover:bg-warn/10" aria-label="關閉" @click="ui.dismiss()"><X :size="16" /></button>
    </div>
  </div>
</template>
