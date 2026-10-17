import { defineStore } from 'pinia'
import { computed, reactive, ref, toRaw } from 'vue'
import type { ProjectState, Sticker } from '../domain/types'
import { ADVENTURE, doorFor } from '../domain/doors'
import { paperFor } from '../domain/papers'
import { bbox, hits, outer } from '../domain/geometry'
import { currentRev, loadProject, saveProject, SaveConflict, type StoredAsset } from '../storage/idb'
import { assets, addAsset, addCanvasAsset, restoreAssets } from './assets'
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

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error' | 'conflict'

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
  /* Several tabs share one save. Each save bumps a counter; a tab that sees the counter move under it
     stops saving instead of silently overwriting the other tab's work. */
  const tab = uid()
  let rev = 0
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cruise-door-studio') : null
  channel?.addEventListener('message', (e: MessageEvent<{ rev: number; tab: string }>) => {
    if (e.data.tab !== tab && e.data.rev > rev) saveStatus.value = 'conflict'
  })

  function scheduleSave() {
    clearTimeout(saveTimer)
    if (saveStatus.value === 'conflict') return
    saveStatus.value = 'saving'
    saveTimer = setTimeout(async () => {
      try {
        rev = await saveProject(toRaw(p), assets as Map<string, StoredAsset>, referencedAssets(), rev, tab)
        channel?.postMessage({ rev, tab })
        saveStatus.value = 'saved'
        savedAt.value = new Date()
      } catch (e) {
        saveStatus.value = e instanceof SaveConflict ? 'conflict' : 'error'
      }
    }, 600)
  }

  /** Keep this tab's layout after a conflict: overwrite whatever the other tab saved. */
  async function keepThisTab() {
    rev = await currentRev()
    saveStatus.value = 'saved'
    scheduleSave()
  }

  /** Read the last layout back. Returns how many stickers had to be dropped because their picture was missing. */
  async function load(): Promise<{ lost: number }> {
    try {
      const stored = await loadProject()
      if (stored) {
        rev = stored.rev
        await restoreAssets(stored.assets)
        const project = { ...defaultProject(), ...stored.project }
        const missing = project.stickers.filter(s => !assets.has(s.assetId))
        project.stickers = project.stickers.filter(s => assets.has(s.assetId))
        // missing examples are simply redrawn; only the user's own pictures count as lost
        const lost = missing.filter(s => !s.sample).length
        Object.assign(p, project)
        // nothing usable left: start again from the examples instead of an empty door
        if (missing.length && !p.stickers.length) await addSamples()
        last = snap()
        saveStatus.value = 'saved'
        if (missing.length) scheduleSave()
        return { lost }
      }
    } catch {
      saveStatus.value = 'error'
    }
    await addSamples()
    last = snap()
    scheduleSave()
    return { lost: 0 }
  }

  /** Put the example stickers back (offered on an empty door). */
  async function restoreSamples() {
    await addSamples()
    commit()
  }

  /** Open a project file. The previous layout stays one undo step away. */
  async function replaceAll(project: ProjectState, list: StoredAsset[]) {
    await restoreAssets(list)
    Object.assign(p, { ...defaultProject(), ...project })
    commit()
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

  /** First free spot (scanning the lower half of the door) where `s` overlaps no other sticker and no keep-out zone. */
  function freeSpot(s: Sticker, others: Sticker[]): { x: number; y: number } | null {
    const d = door.value
    const o = outer(s)
    const GAP = 8
    const boxes = others.map(bbox)
    for (let y = d.h * 0.5 + o.h / 2; y <= d.h - o.h / 2 - 10; y += 10) {
      for (let x = o.w / 2 + 15; x <= d.w - o.w / 2 - 15; x += 10) {
        const c = { ...s, x, y }
        if (hits(c, d.keepOut, d).length) continue
        const b = bbox(c)
        if (boxes.some(r => b.x < r.x + r.w + GAP && b.x + b.w + GAP > r.x && b.y < r.y + r.h + GAP && b.y + b.h + GAP > r.y)) continue
        return { x, y }
      }
    }
    return null
  }

  /** Add uploaded files, each placed in a free spot on the lower half of the door. */
  async function addFiles(files: File[], isSvg: (f: File) => boolean): Promise<{ added: Sticker[]; failed: string[] }> {
    const added: Sticker[] = []
    const failed: string[] = []
    const d = door.value
    const w = files.length > 12 ? 80 : 100
    for (const f of files) {
      try {
        const a = await addAsset(f, isSvg(f))
        const s: Sticker = {
          id: uid(), name: f.name.replace(/\.[^.]+$/, '') || '貼上的圖片', assetId: a.id, origAssetId: a.id,
          ar: a.art.height / a.art.width, w, x: d.w / 2, y: d.h * 0.75, rot: 0, border: 2, cut: false, tile: false,
        }
        Object.assign(s, freeSpot(s, [...p.stickers, ...added]) ?? { x: d.w / 2 + (added.length % 5) * 15, y: d.h * 0.75 + (added.length % 5) * 15 })
        added.push(s)
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
    p, door, paper, byId, saveStatus, savedAt, keepThisTab,
    commit, undo, redo, canUndo, canRedo,
    load, restoreSamples, replaceAll, addFiles, replaceArt, remove, duplicate, reorder,
  }
})
