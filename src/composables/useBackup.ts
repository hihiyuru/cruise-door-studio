import { useProject } from '../stores/project'
import { useUi } from '../stores/ui'
import { assets } from '../stores/assets'
import { exportProject } from '../storage/projectFile'
import { downloadBlob, stamp } from '../export/download'
import { useLocale } from '../stores/locale'

/** Download the layout and every picture it uses as one .json file. */
export function useBackup() {
  const project = useProject()
  const ui = useUi()
  const i18n = useLocale()
  return async function backup() {
    try {
      const used = new Set(project.state.stickers.flatMap(s => [s.assetId, s.origAssetId]))
      const blob = await exportProject(JSON.parse(JSON.stringify(project.state)), [...assets.values()].filter(a => used.has(a.id)))
      downloadBlob(blob, i18n.m.backup.fileName(stamp()))
      ui.notify(i18n.m.backup.downloaded)
    } catch (e) {
      console.error(e)
      ui.fail(i18n.m.backup.downloadFailed)
    }
  }
}
