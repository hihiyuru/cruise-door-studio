import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { assets } from '../stores/assets'
import { exportProject } from '../storage/projectFile'
import { downloadBlob, stamp } from '../export/download'

/** Download the layout and every picture it uses as one .json file. */
export function useBackup() {
  const project = useProject()
  const ui = useUi()
  return async function backup() {
    const used = new Set(project.p.stickers.flatMap(s => [s.assetId, s.origAssetId]))
    const blob = await exportProject(JSON.parse(JSON.stringify(project.p)), [...assets.values()].filter(a => used.has(a.id)))
    downloadBlob(blob, `艙門裝飾專案-${stamp()}.json`)
    ui.notify('已備份。換電腦時用「開啟專案檔」。')
  }
}
