import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useLocale } from '../stores/locale'

/**
 * Tell the person what just happened, with an undo for exactly that step.
 * The offer disappears once another change lands, so it never undoes something else.
 */
export function useUndoToast() {
  const project = useProject()
  const ui = useUi()
  const i18n = useLocale()
  return function notifyUndoable(text: string) {
    const step = project.head
    ui.notify(text, { action: { label: i18n.m.toast.undo, run: () => { if (project.head === step) project.undo() } }, step })
  }
}
