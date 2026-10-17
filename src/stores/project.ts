import { defineStore } from 'pinia'
import { computed, reactive, ref, toRaw } from 'vue'
import type { ProjectState, Sticker } from '../domain/types'
import { ADVENTURE, doorFor } from '../domain/doors'
import { paperFor } from '../domain/papers'
import { loadProject, saveProject, type StoredAsset } from '../storage/idb'
import { assets, addAsset, addCanvasAsset, clearAssets, restoreAssets } from './assets'
import { sampleArt } from '../render/samples'

const HISTORY_LIMIT = 50

export const uid = () => Math.random().toString(36).slice(2, 10)

export function defaultProject(): ProjectState {
  return {
    version: 1,
    doorId: ADVENTURE.id,
    customDoor: { w: 800, h: 2000 },
    roomNo: '10812',
    stickers: [],
    print: { place: 'ibon', paperId: 'ibon-a3', custom: { w: 210, h: 297 }, margin: 8, gap: 4 },
    view: { keepOut: true, grid: false },
  }
}

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error'

export const useProject = defineStore('project', () => {
  const p = reactive<ProjectState>(defaultProject())
  const saveStatus = ref<SaveStatus>('loading')
  const savedAt = ref<Date | null>(null)

  const door = computed(() => doorFor(p.doorId, p.customDoor))
  const paper = computed(() => paperFor(p.print.place, p.print.paperId, p.print.custom))
  const byId = (id: string | null) => (id ? p.stickers.find(s => s.id === id) : undefined)

  /* ---------- undo / redo (snapshots of the plain project state) ---------- */
  const snap = () => JSON.stringify(toRaw(p))
  let last = snap()
  const past = ref<string[]>([])
  const future = ref<string[]>([])

  function apply(json: string) {
    Object.assign(p, JSON.parse(json))
    last = json
    scheduleSave()
  }

  /** Record the current state as one undo step (call after a change is finished, e.g. on drag end). */
  function commit() {
    const now = snap()
    if (now === last) return
    past.value.push(last)
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    future.value = []
    last = now
    scheduleSave()
  }
  function undo() {
    const prev = past.value.pop()
    if (!prev) return false
    future.value.push(snap())
    apply(prev)
    return true
  }
  function redo() {
    const next = future.value.pop()
    if (!next) return false
    past.value.push(snap())
    apply(next)
    return true
  }
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  /* ---------- persistence ---------- */
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  function referencedAssets(): Set<string> {
    const keep = new Set<string>()
    for (const json of [last, ...past.value, ...future.value]) {
      for (const s of (JSON.parse(json) as ProjectState).stickers) { keep.add(s.assetId); keep.add(s.origAssetId) }
    }
    return keep
  }
  function scheduleSave() {
    clearTimeout(saveTimer)
    saveStatus.value = 'saving'
    saveTimer = setTimeout(async () => {
      try {
        await saveProject(toRaw(p), assets as Map<string, StoredAsset>, referencedAssets())
        saveStatus.value = 'saved'
        savedAt.value = new Date()
      } catch {
        saveStatus.value = 'error'
      }
    }, 600)
  }

  async function load() {
    try {
      const stored = await loadProject()
      if (stored) {
        await restoreAssets(stored.assets)
        const project = { ...defaultProject(), ...stored.project }
        // drop stickers whose picture could not be read back
        project.stickers = project.stickers.filter(s => assets.has(s.assetId))
        Object.assign(p, project)
        last = snap()
        saveStatus.value = 'saved'
        return
      }
    } catch {
      saveStatus.value = 'error'
    }
    await addSamples()
    last = snap()
    scheduleSave()
  }

  async function replaceAll(project: ProjectState, list: StoredAsset[]) {
    clearAssets()
    await restoreAssets(list)
    Object.assign(p, { ...defaultProject(), ...project })
    past.value = []
    future.value = []
    last = snap()
    scheduleSave()
  }

  /* ---------- stickers ---------- */
  async function addSamples() {
    for (const s of sampleArt()) {
      const a = await addCanvasAsset(s.art)
      p.stickers.push({
        id: uid(), name: s.name, assetId: a.id, origAssetId: a.id, ar: a.art.height / a.art.width,
        w: s.w, x: s.x, y: s.y, rot: s.rot, border: 3, cut: false, tile: false, sample: true,
      })
    }
  }

  /** Add uploaded files, laid out in a grid on the lower part of the door so they do not pile up. */
  async function addFiles(files: File[], isSvg: (f: File) => boolean): Promise<{ added: Sticker[]; failed: string[] }> {
    const added: Sticker[] = []
    const failed: string[] = []
    const d = door.value
    const w = files.length > 12 ? 80 : 100
    const cols = Math.max(1, Math.floor((d.w - 40) / (w + 15)))
    const startY = d.h * 0.58
    const taken = p.stickers.filter(s => !s.sample).length
    for (const f of files) {
      try {
        const a = await addAsset(f, isSvg(f))
        const n = taken + added.length
        const col = n % cols
        const row = Math.floor(n / cols)
        const ar = a.art.height / a.art.width
        added.push({
          id: uid(), name: f.name.replace(/\.[^.]+$/, '') || '貼上的圖片', assetId: a.id, origAssetId: a.id, ar, w,
          x: 20 + (w + 15) * (col + 0.5),
          y: Math.min(d.h - 60, startY + (row % 6) * (w * Math.min(ar, 1.3) + 20) + 60),
          rot: 0, border: 2, cut: false, tile: false,
        })
      } catch {
        failed.push(f.name)
      }
    }
    p.stickers.push(...added)
    commit()
    return { added, failed }
  }

  /** Swap a sticker's picture, keeping its place, width, rotation and border. */
  async function replaceArt(id: string, f: File, isSvg: boolean) {
    const s = byId(id)
    if (!s) return
    const a = await addAsset(f, isSvg)
    Object.assign(s, { assetId: a.id, origAssetId: a.id, ar: a.art.height / a.art.width, name: f.name.replace(/\.[^.]+$/, '') || s.name, sample: false })
    commit()
  }

  function remove(id: string) {
    const i = p.stickers.findIndex(s => s.id === id)
    if (i < 0) return null
    const [s] = p.stickers.splice(i, 1)
    commit()
    return s
  }

  function duplicate(id: string, mirror: boolean) {
    const s = byId(id)
    if (!s) return null
    const n: Sticker = { ...s, id: uid() }
    if (mirror) { n.x = door.value.w - s.x; n.rot = -s.rot } else { n.x += 20; n.y += 20 }
    p.stickers.push(n)
    commit()
    return n
  }

  function reorder(id: string, to: number) {
    const i = p.stickers.findIndex(s => s.id === id)
    if (i < 0) return
    const [s] = p.stickers.splice(i, 1)
    p.stickers.splice(Math.max(0, Math.min(p.stickers.length, to)), 0, s)
    commit()
  }

  return {
    p, door, paper, byId, saveStatus, savedAt,
    commit, undo, redo, canUndo, canRedo,
    load, replaceAll, addFiles, replaceArt, remove, duplicate, reorder,
  }
})
