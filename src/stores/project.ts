import { defineStore } from 'pinia'
import { computed, reactive, ref, toRaw } from 'vue'
import type { ProjectState, Sticker } from '../domain/types'
import { ADVENTURE, doorFor } from '../domain/doors'
import { paperFor } from '../domain/papers'
import { layoutSheets } from '../domain/packing'
import { freeSpot } from '../domain/placement'
import { fileBaseName, newId } from '../domain/format'
import { currentRev, loadProject, saveProject, SaveConflict, type StoredAsset } from '../storage/idb'
import { assets, addAsset, addCanvasAsset, restoreAssets } from './assets'
import { sampleArt } from '../render/samples'

const HISTORY_LIMIT = 50
/** New pictures start this wide; when many arrive at once, a little smaller so more fit on the door. */
const DEFAULT_WIDTH_MM = 100
const BULK_WIDTH_MM = 80
const BULK_UPLOAD = 12
/** Wait this long after the last change before writing, so a drag saves once. */
const SAVE_DEBOUNCE_MS = 600


export function defaultProject(): ProjectState {
  return {
    version: 1,
    doorId: ADVENTURE.id,
    customDoor: { w: 800, h: 2000 },
    // deck 99 does not exist on the ship, so the preview never shows a real guest's cabin
    roomNo: '99999',
    stickers: [],
    print: { place: 'ibon', paperId: 'ibon-a3', custom: { w: 210, h: 297 }, margin: 8, gap: 4 },
    view: { keepOut: true, grid: false },
  }
}

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error' | 'conflict'

export const useProject = defineStore('project', () => {
  const state = reactive<ProjectState>(defaultProject())
  const saveStatus = ref<SaveStatus>('loading')
  const savedAt = ref<Date | null>(null)

  const door = computed(() => doorFor(state.doorId, state.customDoor))
  const paper = computed(() => paperFor(state.print.place, state.print.paperId, state.print.custom))
  const byId = (id: string | null) => (id ? state.stickers.find(s => s.id === id) : undefined)
  /** How the stickers land on the chosen paper; shared by the top bar, the settings panel and the print step. */
  const layout = computed(() => layoutSheets(state.stickers, paper.value, state.print.margin, state.print.gap))
  const usable = computed(() => ({ w: paper.value.w - 2 * state.print.margin, h: paper.value.h - 2 * state.print.margin }))

  /* ---------- undo / redo (snapshots of the plain project state) ---------- */
  const snap = () => JSON.stringify(toRaw(state))
  let last = snap()
  const past = ref<string[]>([])
  const future = ref<string[]>([])
  /** Changes on every commit, undo and redo; an offer to undo one particular step checks it is still the latest. */
  const head = ref(0)

  function apply(json: string) {
    Object.assign(state, JSON.parse(json))
    last = json
    head.value++
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
    head.value++
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
  const tab = newId()
  let rev = 0
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cruise-door-studio') : null
  channel?.addEventListener('message', (e: MessageEvent<{ rev: number; tab: string }>) => {
    if (e.data.tab !== tab && e.data.rev > rev) saveStatus.value = 'conflict'
  })

  /* Saves run one after another: a save that starts while the previous one is still writing would carry
     the old counter and look like another tab's edit. */
  let queue: Promise<void> = Promise.resolve()

  async function writeNow() {
    if (saveStatus.value === 'conflict') return
    try {
      rev = await saveProject(toRaw(state), assets as Map<string, StoredAsset>, referencedAssets(), rev, tab)
      channel?.postMessage({ rev, tab })
      saveStatus.value = 'saved'
      savedAt.value = new Date()
    } catch (e) {
      saveStatus.value = e instanceof SaveConflict ? 'conflict' : 'error'
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer)
    if (saveStatus.value === 'conflict') return
    saveStatus.value = 'saving'
    saveTimer = setTimeout(() => { queue = queue.then(writeNow) }, SAVE_DEBOUNCE_MS)
  }

  /** Keep this tab's layout after a conflict: overwrite whatever the other tab saved. */
  async function keepThisTab() {
    try {
      rev = await currentRev()
    } catch {
      saveStatus.value = 'error'
      return
    }
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
        Object.assign(state, project)
        // nothing usable left: start again from the examples instead of an empty door
        if (missing.length && !state.stickers.length) await addSamples()
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

  /** Open a backup. The previous layout stays one undo step away. Returns how many pictures could not be read. */
  async function replaceAll(project: ProjectState, list: StoredAsset[]): Promise<{ lost: number }> {
    await restoreAssets(list)
    const next = { ...defaultProject(), ...project }
    const before = next.stickers.length
    next.stickers = next.stickers.filter(s => assets.has(s.assetId))
    Object.assign(state, next)
    commit()
    return { lost: before - next.stickers.length }
  }

  /* ---------- stickers ---------- */
  async function addSamples() {
    for (const s of sampleArt()) {
      const a = await addCanvasAsset(s.art)
      state.stickers.push({
        id: newId(), name: s.name, assetId: a.id, origAssetId: a.id, ar: a.art.height / a.art.width,
        w: s.w, x: s.x, y: s.y, rot: s.rot, border: 3, cut: false, tile: false, sample: true,
      })
    }
  }

  /** Add uploaded files, each placed in a free spot on the lower half of the door. */
  async function addFiles(files: File[], isSvg: (f: File) => boolean): Promise<{ added: Sticker[]; failed: string[] }> {
    const added: Sticker[] = []
    const failed: string[] = []
    const d = door.value
    const w = files.length > BULK_UPLOAD ? BULK_WIDTH_MM : DEFAULT_WIDTH_MM
    for (const f of files) {
      try {
        const a = await addAsset(f, isSvg(f))
        const s: Sticker = {
          id: newId(), name: fileBaseName(f.name) || '貼上的圖片', assetId: a.id, origAssetId: a.id,
          ar: a.art.height / a.art.width, w, x: d.w / 2, y: d.h * 0.75, rot: 0, border: 2, cut: false, tile: false,
        }
        // no free spot left: fan them out a little around the middle of the lower half so each can still be grabbed
        const fan = (added.length % 5) * 15
        Object.assign(s, freeSpot(s, [...state.stickers, ...added], d) ?? { x: d.w / 2 + fan, y: d.h * 0.75 + fan })
        added.push(s)
      } catch {
        failed.push(f.name)
      }
    }
    state.stickers.push(...added)
    commit()
    return { added, failed }
  }

  /** Swap a sticker's picture, keeping its place, width, rotation and border. */
  async function replaceArt(id: string, f: File, isSvg: boolean) {
    const s = byId(id)
    if (!s) return
    const a = await addAsset(f, isSvg)
    Object.assign(s, { assetId: a.id, origAssetId: a.id, ar: a.art.height / a.art.width, name: fileBaseName(f.name) || s.name, sample: false })
    commit()
  }

  function remove(id: string) {
    const i = state.stickers.findIndex(s => s.id === id)
    if (i < 0) return null
    const [s] = state.stickers.splice(i, 1)
    commit()
    return s
  }

  function duplicate(id: string, mirror: boolean) {
    const s = byId(id)
    if (!s) return null
    const n: Sticker = { ...s, id: newId() }
    if (mirror) { n.x = door.value.w - s.x; n.rot = -s.rot } else { n.x += 20; n.y += 20 }
    state.stickers.push(n)
    commit()
    return n
  }

  function reorder(id: string, to: number) {
    const i = state.stickers.findIndex(s => s.id === id)
    if (i < 0) return
    const [s] = state.stickers.splice(i, 1)
    state.stickers.splice(Math.max(0, Math.min(state.stickers.length, to)), 0, s)
    commit()
  }

  return {
    state, door, paper, byId, saveStatus, savedAt, keepThisTab,
    layout, usable, head, commit, undo, redo, canUndo, canRedo,
    load, restoreSamples, replaceAll, addFiles, replaceArt, remove, duplicate, reorder,
  }
})
