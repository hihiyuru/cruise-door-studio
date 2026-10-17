import type { ProjectState } from '../domain/types'

const DB_NAME = 'cruise-door-studio'
const PROJECT_KEY = 'current'

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

export async function loadProject(): Promise<{ project: ProjectState; assets: StoredAsset[] } | null> {
  const db = await open()
  const t = db.transaction(['project', 'assets'])
  const project = await req<ProjectState | undefined>(t.objectStore('project').get(PROJECT_KEY))
  if (!project) return null
  const assets = await req<StoredAsset[]>(t.objectStore('assets').getAll())
  return { project, assets }
}

/** Save the project and any assets it uses that are not stored yet; drop assets nothing uses. */
export async function saveProject(project: ProjectState, assets: Map<string, StoredAsset>, keep: Set<string>): Promise<void> {
  const db = await open()
  const t = db.transaction(['project', 'assets'], 'readwrite')
  const store = t.objectStore('assets')
  const existing = new Set(await req<IDBValidKey[]>(store.getAllKeys()) as string[])
  for (const id of keep) {
    const a = assets.get(id)
    // store only the plain fields; the working canvas cannot be cloned into IndexedDB
    if (a && !existing.has(id)) store.put({ id: a.id, blob: a.blob, isSvg: a.isSvg })
  }
  for (const id of existing) if (!keep.has(id)) store.delete(id)
  t.objectStore('project').put(JSON.parse(JSON.stringify(project)), PROJECT_KEY)
  await done(t)
}
