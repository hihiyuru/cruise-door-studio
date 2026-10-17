import type { ProjectState } from '../domain/types'
import type { StoredAsset } from './idb'
import { isEmbeddedImage } from '../domain/projectSchema'

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
    throw new ProjectFileError('無法開啟，這不是備份檔。')
  }
  if (file?.format !== FORMAT || !file.project || !Array.isArray(file.assets)) {
    throw new ProjectFileError('無法開啟，這不是備份檔。')
  }
  // only pictures embedded in the file are read; nothing is ever fetched from a link inside it
  const assets = file.assets
    .filter(a => typeof a?.id === 'string' && /^[\w-]{1,64}$/.test(a.id) && isEmbeddedImage(a.data))
    .map(a => ({ id: a.id, isSvg: a.isSvg === true, blob: dataUrlToBlob(a.data) }))
  // the project itself is checked field by field by the caller (sanitizeProject)
  return { project: file.project, assets }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',', 2)
  const type = head.slice('data:'.length, head.indexOf(';'))
  const bytes = Uint8Array.from(atob(body), c => c.charCodeAt(0))
  return new Blob([bytes], { type })
}
