import { computed } from 'vue'
import { useProject } from '../stores/project'
import { CUSTOM_PAPER_ID, papersFor, type Paper } from '../domain/papers'
import type { PrintPlace } from '../domain/types'
import { useLocale } from '../stores/locale'

/** Where and on what paper to print. Shared by the top-bar picker and the print step, so both always agree. */
export function usePrintSettings() {
  const project = useProject()
  const i18n = useLocale()
  const pr = computed(() => project.state.print)
  const papers = computed(() => papersFor(pr.value.place))
  /** Label and hint of the chosen print place. */
  const place = computed(() => i18n.m.places[pr.value.place])
  /** Name of the chosen paper shown to people: A3, A4, A3 加大, or the custom size. */
  const paperName = computed(() => i18n.m.paper.name(project.paper))
  /** e.g. 「7-11 ibon・A3」 */
  const summary = computed(() => i18n.m.printSettings.summary(place.value.label, paperName.value))
  const paperOption = (p: Paper) => i18n.m.paper.option(p, pr.value.place)
  /** Short paper name for file names, e.g. ibon-A3. */
  const paperFileName = computed(() => i18n.m.paper.fileName(project.paper, pr.value.place))

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

  return { pr, papers, place, paperName, summary, paperOption, paperFileName, isCustom, setPlace, setPaper, setCustom }
}
