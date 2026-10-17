import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
  /** Errors stay until dismissed, so a failure is never missed. */
  tone: 'info' | 'error'
}

export const useUi = defineStore('ui', () => {
  const step = ref<'arrange' | 'print'>('arrange')
  const selected = ref<string | null>(null)
  /** Sticker under the pointer in the list, highlighted on the door. */
  const hovered = ref<string | null>(null)
  const editing = ref<string | null>(null)
  const toast = ref<Toast | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let seq = 0

  function notify(text: string, opts: { action?: Toast['action']; tone?: Toast['tone'] } = {}) {
    clearTimeout(timer)
    const tone = opts.tone ?? 'info'
    toast.value = { id: ++seq, text, action: opts.action, tone }
    if (tone === 'info') timer = setTimeout(() => (toast.value = null), opts.action ? 6000 : 3000)
  }
  const fail = (text: string) => notify(text, { tone: 'error' })
  const dismiss = () => { clearTimeout(timer); toast.value = null }

  return { step, selected, hovered, editing, toast, notify, fail, dismiss }
})
