/** Languages the interface comes in. */
export const LOCALES = ['zh-Hant', 'zh-Hans', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale)

/** Value for <html lang>, so Chinese text uses the right glyphs. */
export const HTML_LANG: Record<Locale, string> = { 'zh-Hant': 'zh-Hant-TW', 'zh-Hans': 'zh-Hans', en: 'en' }

const TRADITIONAL_REGIONS = ['tw', 'hk', 'mo']

/**
 * Pick the interface language from the browser's preferred languages, first match wins.
 * Chinese with a Traditional script or a Taiwan / Hong Kong / Macau region is Traditional; any other Chinese,
 * including a bare `zh`, is Simplified. Anything we do not have falls back to English.
 */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const [lang, ...rest] = tag.toLowerCase().split(/[-_]/)
    if (lang === 'en') return 'en'
    if (lang !== 'zh') continue
    if (rest.includes('hant') || rest.some(r => TRADITIONAL_REGIONS.includes(r))) return 'zh-Hant'
    return 'zh-Hans'
  }
  return 'en'
}
