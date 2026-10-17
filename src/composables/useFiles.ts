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
    if (failed.length) ui.notify(`讀不到「${failed.join('、')}」，請換成 PNG、JPG 或 SVG`)
    else ui.notify(added.length > 1 ? `已加入 ${added.length} 張，排在門的下半部` : '已加入。背景要去掉的話，按右邊的「去背」')
  }
}
