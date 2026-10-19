import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { isSvgFile } from '../stores/assets'
import { useLocale } from '../stores/locale'

/** Adding pictures from the file picker, drag and drop, or paste. */
export function useAddFiles() {
  const project = useProject()
  const ui = useUi()
  const i18n = useLocale()
  return async function add(list: FileList | File[] | null | undefined) {
    // non-images are not filtered out here: they fail to decode and get named in the message, instead of vanishing silently
    const files = [...(list ?? [])]
    if (!files.length) return
    const { added, failed } = await project.addFiles(files, isSvgFile)
    if (added.length) ui.selected = added.at(-1)!.id
    const { m } = i18n
    if (failed.length) ui.fail(m.stickers.cannotOpen(m.list(failed)))
    else ui.notify(m.stickers.added(added.length))
  }
}
