import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { MESSAGES, type Locale } from '../i18n'

/** The language the interface is shown in, and its text. Components read text as `m.value.<area>.<key>`. */
export const useLocale = defineStore('locale', () => {
  const locale = ref<Locale>('zh-Hant')
  const m = computed(() => MESSAGES[locale.value])
  return { locale, m }
})
