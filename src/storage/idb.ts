import type { ProjectState } from '../domain/types'

const DB_NAME = 'cruise-door-studio'
const PROJECT_KEY = 'current'
/** Save counter shared by every tab, so a tab can tell another one saved after it loaded. */
const META_KEY = 'meta'

interface SaveMeta { rev: number; tab: string }

/** Another tab saved after this one loaded; writing now would overwrite its work. */
export class SaveConflict extends Error {}

export interface StoredAsset { id: string; blob: Blob; isSvg: boolean }

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('project')
      r.result.createObjectStore('assets', { keyPath: 'id' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  return dbPromise
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function done(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

export async function loadProject(): Promise<{ project: ProjectState; assets: StoredAsset[]; rev: number } | null> {
  const db = await open()
  const t = db.transaction(['project', 'assets'])
  const project = await req<ProjectState | undefined>(t.objectStore('project').get(PROJECT_KEY))
  if (!project) return null
  const meta = await req<SaveMeta | undefined>(t.objectStore('project').get(META_KEY))
  const assets = await req<StoredAsset[]>(t.objectStore('assets').getAll())
  return { project, assets, rev: meta?.rev ?? 0 }
}

export async function currentRev(): Promise<number> {
  const db = await open()
  const meta = await req<SaveMeta | undefined>(db.transaction('project').objectStore('project').get(META_KEY))
  return meta?.rev ?? 0
}

/**
 * Save the project and any assets it uses that are not stored yet; drop assets nothing uses.
 * `expectRev` is the save counter this tab last saw; if another tab has saved since, nothing is written
 * and SaveConflict is thrown. Returns the new counter.
 */
export async function saveProject(project: ProjectState, assets: Map<string, StoredAsset>, keep: Set<string>, expectRev: number, tab: string): Promise<number> {
  const db = await open()
  const t = db.transaction(['project', 'assets'], 'readwrite')
  const meta = await req<SaveMeta | undefined>(t.objectStore('project').get(META_KEY))
  const rev = meta?.rev ?? 0
  if (rev !== expectRev) {
    t.abort()
    throw new SaveConflict()
  }
  const store = t.objectStore('assets')
  const existing = new Set(await req<IDBValidKey[]>(store.getAllKeys()) as string[])
  for (const id of keep) {
    const a = assets.get(id)
    // store only the plain fields; the working canvas cannot be cloned into IndexedDB
    if (a && !existing.has(id)) store.put({ id: a.id, blob: a.blob, isSvg: a.isSvg })
  }
  for (const id of existing) if (!keep.has(id)) store.delete(id)
  t.objectStore('project').put(JSON.parse(JSON.stringify(project)), PROJECT_KEY)
  t.objectStore('project').put({ rev: rev + 1, tab } satisfies SaveMeta, META_KEY)
  await done(t)
  return rev + 1
}
