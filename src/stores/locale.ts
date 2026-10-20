import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import { detectLocale, HTML_LANG, isLocale, MESSAGES, type Locale } from '../i18n'

/** Only set once someone picks a language; until then the browser's language decides. */
const STORAGE_KEY = 'cruise-door-studio:locale'

function savedLocale(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return isLocale(v) ? v : null
  } catch {
    // private windows and blocked site data: fall back to the browser's language
    return null
  }
}

const browserLanguages = (): readonly string[] => (typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language])

/** The language the interface is shown in, and its text. Components read text as `m.value.<area>.<key>`. */
export const useLocale = defineStore('locale', () => {
  const locale = ref<Locale>(savedLocale() ?? detectLocale(browserLanguages()))
  const m = computed(() => MESSAGES[locale.value])

  /** Takes effect at once; the layout, pictures and undo history are untouched. */
  function setLocale(l: Locale) {
    locale.value = l
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // the choice still applies to this visit
    }
  }

  // <html lang> picks the right Chinese glyphs; document.title stays as written in index.html, for search engines
  watchEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = HTML_LANG[locale.value]
  })

  return { locale, m, setLocale }
})
