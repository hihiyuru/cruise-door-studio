import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { useUndoToast } from './useUndoToast'
import { useLocale } from '../stores/locale'

/** Delete and duplicate, used by the floating toolbar, the settings panel and the Delete key. */
export function useStickerActions() {
  const project = useProject()
  const ui = useUi()
  const notifyUndoable = useUndoToast()
  const i18n = useLocale()

  function remove(id: string) {
    const removed = project.remove(id)
    ui.selected = null
    if (removed) notifyUndoable(i18n.m.stickers.deleted(removed.name))
  }

  /** `mirror` places the copy at the same height on the other side of the door. */
  function duplicate(id: string, mirror = false) {
    const copy = project.duplicate(id, mirror)
    if (copy) ui.selected = copy.id
  }

  return { remove, duplicate }
}
