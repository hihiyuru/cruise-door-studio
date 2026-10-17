import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { isSvgFile } from '../stores/assets'

/** Adding pictures from the file picker, drag and drop, or paste. */
export function useAddFiles() {
  const project = useProject()
  const ui = useUi()
  return async function add(list: FileList | File[] | null | undefined) {
    // non-images are not filtered out here: they fail to decode and get named in the message, instead of vanishing silently
    const files = [...(list ?? [])]
    if (!files.length) return
    const { added, failed } = await project.addFiles(files, isSvgFile)
    if (added.length) ui.selected = added.at(-1)!.id
    if (failed.length) ui.fail(`無法開啟 ${failed.join('、')}，改用 JPG 或 PNG。`)
    else ui.notify(added.length > 1 ? `已加入 ${added.length} 張。` : '已加入。')
  }
}
