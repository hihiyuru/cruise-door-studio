import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// a slow IndexedDB: each save takes 1 s and checks the counter like the real one
let storedRev = 0
vi.mock('../storage/idb', () => {
  class SaveConflict extends Error {}
  return {
    SaveConflict,
    loadProject: vi.fn(async () => null),
    currentRev: vi.fn(async () => storedRev),
    saveProject: vi.fn(async (_p: unknown, _a: unknown, _k: unknown, expectRev: number) => {
      await new Promise(r => setTimeout(r, 1000))
      if (expectRev !== storedRev) throw new SaveConflict()
      return ++storedRev
    }),
  }
})
vi.mock('./assets', () => ({ assets: new Map(), addAsset: vi.fn(), addCanvasAsset: vi.fn(), restoreAssets: vi.fn() }))
vi.mock('../render/samples', () => ({ sampleArt: () => [] }))

describe('autosave', () => {
  beforeEach(() => {
    storedRev = 0
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('does not report a conflict when a second edit lands while the first save is still writing', async () => {
    const { useProject } = await import('./project')
    const project = useProject()
    await project.load()
    project.p.roomNo = '1'
    project.commit()
    await vi.advanceTimersByTimeAsync(700) // first save has started and is still writing
    project.p.roomNo = '2'
    project.commit()
    await vi.advanceTimersByTimeAsync(5000)
    expect(project.saveStatus).toBe('saved')
    expect(storedRev).toBe(2)
  })
})
