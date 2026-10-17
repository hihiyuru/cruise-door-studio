import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'

/**
 * Tell the person what just happened, with an undo for exactly that step.
 * The offer disappears once another change lands, so it never undoes something else.
 */
export function useUndoToast() {
  const project = useProject()
  const ui = useUi()
  return function notifyUndoable(text: string) {
    const step = project.head
    ui.notify(text, { action: { label: '復原', run: () => { if (project.head === step) project.undo() } }, step })
  }
}
