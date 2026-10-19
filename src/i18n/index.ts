import { zhHant, type Messages } from './locales/zhHant'

export type { Messages }

export const MESSAGES = {
  'zh-Hant': zhHant,
} satisfies Record<string, Messages>

export type Locale = keyof typeof MESSAGES
