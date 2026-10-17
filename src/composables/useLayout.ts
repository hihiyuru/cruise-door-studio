import { computed, type ComputedRef } from 'vue'
import { useProject } from '../stores/project'
import { layoutSheets, type Layout } from '../domain/packing'

let shared: { layout: ComputedRef<Layout>; usable: ComputedRef<{ w: number; h: number }> } | null = null

/** Sheet layout for the current paper, computed once and shared by the top bar, inspector and print step. */
export function useLayout() {
  if (shared) return shared
  const project = useProject()
  shared = {
    layout: computed(() => layoutSheets(project.p.stickers, project.paper, project.p.print.margin, project.p.print.gap)),
    usable: computed(() => ({
      w: project.paper.w - 2 * project.p.print.margin,
      h: project.paper.h - 2 * project.p.print.margin,
    })),
  }
  return shared
}
