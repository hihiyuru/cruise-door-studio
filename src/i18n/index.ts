import { zhHant, type Messages } from './locales/zhHant'
import { zhHans } from './locales/zhHans'
import { en } from './locales/en'
import type { Locale } from './detect'

export type { Messages }
export { detectLocale, isLocale, HTML_LANG, LOCALES, type Locale } from './detect'

export const MESSAGES: Record<Locale, Messages> = { 'zh-Hant': zhHant, 'zh-Hans': zhHans, en }

/** Each language's name in itself, so people can find their own when the screen is in one they can't read. */
export const LOCALE_NAMES: Record<Locale, string> = { 'zh-Hant': '繁體中文', 'zh-Hans': '简体中文', en: 'English' }
