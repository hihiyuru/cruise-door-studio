import type { ProjectState } from '../domain/types'
import type { StoredAsset } from './idb'

const FORMAT = 'cruise-door-studio'

interface ProjectFile {
  format: typeof FORMAT
  version: 1
  savedAt: string
  project: ProjectState
  assets: { id: string; isSvg: boolean; type: string; data: string }[]
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

/** One self-contained JSON file with the layout and every picture it uses. */
export async function exportProject(project: ProjectState, assets: StoredAsset[]): Promise<Blob> {
  const file: ProjectFile = {
    format: FORMAT,
    version: 1,
    savedAt: new Date().toISOString(),
    project,
    assets: await Promise.all(assets.map(async a => ({ id: a.id, isSvg: a.isSvg, type: a.blob.type, data: await blobToDataUrl(a.blob) }))),
  }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export class ProjectFileError extends Error {}

export async function importProject(f: Blob): Promise<{ project: ProjectState; assets: StoredAsset[] }> {
  let file: ProjectFile
  try {
    file = JSON.parse(await f.text())
  } catch {
    throw new ProjectFileError('無法開啟，這不是專案檔。')
  }
  if (file?.format !== FORMAT || !file.project || !Array.isArray(file.assets)) {
    throw new ProjectFileError('無法開啟，這不是專案檔。')
  }
  const assets = await Promise.all(file.assets.map(async a => ({
    id: a.id,
    isSvg: a.isSvg,
    blob: await (await fetch(a.data)).blob(),
  })))
  return { project: file.project, assets }
}
