import { expect, test } from '@playwright/test'
import { openApp, stickers } from './helpers'

// Scenario map F7–F9: the interface follows the browser's language, and the top-bar picker overrides it

const picker = (page: import('@playwright/test').Page) => page.getByRole('combobox', { name: '語言 Language' })

test.describe('an English browser', () => {
  test.use({ locale: 'en-US' })

  test('F7 opens in English; the guide below stays in Traditional Chinese', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cruise Door Studio')
    await expect(page.getByRole('button', { name: 'Add pictures' })).toBeVisible()
    await expect(picker(page)).toHaveValue('en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('#guide')).toHaveAttribute('lang', 'zh-Hant-TW')
    await expect(page).toHaveTitle(/迪士尼郵輪房門尺寸/)
  })

  test('F8 picking 繁體中文 switches at once, keeps the layout, and is remembered', async ({ page }) => {
    await openApp(page)
    const before = await stickers(page).first().boundingBox()
    await picker(page).selectOption('zh-Hant')
    await expect(page.getByRole('button', { name: '加入圖片' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-TW')
    await expect(stickers(page)).toHaveCount(3)
    expect(await stickers(page).first().boundingBox()).toEqual(before)
    await page.reload()
    await expect(page.getByRole('button', { name: '加入圖片' })).toBeVisible()
    await expect(picker(page)).toHaveValue('zh-Hant')
  })
})

test.describe('a Simplified Chinese browser', () => {
  test.use({ locale: 'zh-CN' })

  test('F9 opens in Simplified Chinese', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('button', { name: '添加图片' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
  })
})

test.describe('a browser in a language we do not have', () => {
  test.use({ locale: 'ja-JP' })

  test('F7 falls back to English', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('button', { name: 'Add pictures' })).toBeVisible()
  })
})
