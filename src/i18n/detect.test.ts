import { describe, expect, it } from 'vitest'
import { detectLocale } from './detect'

describe('detectLocale', () => {
  it('reads Taiwan, Hong Kong, Macau and the Traditional script as Traditional Chinese', () => {
    for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW', 'zh_TW']) expect(detectLocale([tag])).toBe('zh-Hant')
  })
  it('reads other Chinese, including a bare zh, as Simplified Chinese', () => {
    for (const tag of ['zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN', 'zh']) expect(detectLocale([tag])).toBe('zh-Hans')
  })
  it('reads any English as English', () => {
    expect(detectLocale(['en-US'])).toBe('en')
    expect(detectLocale(['en-GB'])).toBe('en')
  })
  it('uses the first language it has, in the order the browser prefers', () => {
    expect(detectLocale(['ja-JP', 'zh-TW', 'en'])).toBe('zh-Hant')
    expect(detectLocale(['en-US', 'zh-TW'])).toBe('en')
  })
  it('falls back to English when none match', () => {
    expect(detectLocale(['ja-JP', 'ko-KR'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })
})
