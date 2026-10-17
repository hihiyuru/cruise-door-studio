import { computed } from 'vue'
import { useProject } from '../stores/project'
import { CUSTOM_PAPER_ID, PLACES, paperName, papersFor } from '../domain/papers'
import type { PrintPlace } from '../domain/types'

/** Where and on what paper to print. Shared by the top-bar picker and the print step, so both always agree. */
export function usePrintSettings() {
  const project = useProject()
  const pr = computed(() => project.p.print)
  const papers = computed(() => papersFor(pr.value.place))
  const place = computed(() => PLACES.find(p => p.id === pr.value.place)!)
  /** e.g. 「7-11 ibon・A3」 */
  const summary = computed(() => `${place.value.short}・${paperName(project.paper)}`)

  function setPlace(id: PrintPlace) {
    pr.value.place = id
    if (!papersFor(id).some(p => p.id === pr.value.paperId)) pr.value.paperId = papersFor(id)[0].id
    project.commit()
  }
  function setPaper(id: string) {
    pr.value.paperId = id
    project.commit()
  }
  function setCustom(key: 'w' | 'h', v: string) {
    pr.value.custom[key] = Math.max(50, Math.min(1500, Math.round(+v || 0)))
    project.commit()
  }
  const isCustom = computed(() => pr.value.place === 'shop' && pr.value.paperId === CUSTOM_PAPER_ID)

  return { pr, papers, place, summary, isCustom, setPlace, setPaper, setCustom }
}
