import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast { id: number; text: string; action?: { label: string; run: () => void } }

export const useUi = defineStore('ui', () => {
  const step = ref<'arrange' | 'print'>('arrange')
  const selected = ref<string | null>(null)
  const editing = ref<string | null>(null)
  const toast = ref<Toast | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let seq = 0

  function notify(text: string, action?: Toast['action']) {
    clearTimeout(timer)
    toast.value = { id: ++seq, text, action }
    timer = setTimeout(() => (toast.value = null), action ? 6000 : 3000)
  }

  return { step, selected, editing, toast, notify }
})
