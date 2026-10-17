import { expect, test } from '@playwright/test'
import { addPictures, failure, info, openApp, stickers } from './helpers'

// Scenario map A (opening the site) and B (adding pictures)

test('A1 first visit shows three example stickers and a way to clear them', async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole('button', { name: '清掉範例' })).toBeVisible()
})

test('page assets load: favicon, scripts, styles (caught the doubled base path once)', async ({ page }) => {
  const broken: string[] = []
  page.on('response', r => { if (r.status() >= 400) broken.push(`${r.status()} ${r.url()}`) })
  await openApp(page)
  const icon = await page.locator('link[rel=icon][type="image/svg+xml"]').getAttribute('href')
  const res = await page.request.get(new URL(icon!, page.url()).href)
  expect(res.status()).toBe(200)
  expect(broken).toEqual([])
})

test('A3 own pictures missing from the save: red notice, the rest stays', async ({ page }) => {
  await openApp(page)
  await addPictures(page, 'tiny.png')
  await expect(stickers(page)).toHaveCount(4)
  await expect(page.getByText(/已自動儲存/)).toBeVisible()
  await page.evaluate(() => new Promise<void>(resolve => {
    const r = indexedDB.open('cruise-door-studio')
    r.onsuccess = () => {
      const t = r.result.transaction('assets', 'readwrite')
      t.objectStore('assets').clear()
      t.oncomplete = () => resolve()
    }
  }))
  await page.reload()
  await expect(failure(page)).toContainText('找不到 1 張圖，已從門上移除。')
})

test('A4 the browser refuses storage: a banner offers a backup instead', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get: () => ({ open() { throw new Error('blocked') } }) })
  })
  await page.goto('./')
  await expect(page.getByRole('alert').filter({ hasText: '無法自動儲存，關掉前先備份。' })).toBeVisible()
  await expect(page.getByRole('button', { name: '下載備份' })).toBeVisible()
})

test('B2 adding a picture says so briefly and selects it', async ({ page }) => {
  await openApp(page)
  await addPictures(page, 'tiny.png')
  await expect(info(page)).toHaveText('已加入。')
  await expect(page.locator('.sticker[aria-pressed="true"]')).toHaveCount(1)
  await expect(info(page)).toBeHidden({ timeout: 5000 })
})

test('B3 files that are not pictures: one red notice naming them, stays until closed', async ({ page }) => {
  await openApp(page)
  await addPictures(page, 'not-an-image.txt', 'IMG_2041.HEIC')
  const alert = failure(page)
  await expect(alert).toContainText('無法開啟 not-an-image.txt、IMG_2041.HEIC，改用 JPG 或 PNG。')
  await page.waitForTimeout(4000)
  await expect(alert).toBeVisible()
  await alert.getByRole('button', { name: '關閉' }).click()
  await expect(alert).toBeHidden()
  await expect(stickers(page)).toHaveCount(3)
})

test('B new pictures find free spots instead of piling up', async ({ page }) => {
  await openApp(page)
  await addPictures(page, ...Array(12).fill('tiny.png'))
  await expect(stickers(page)).toHaveCount(15)
  const boxes = await stickers(page).evaluateAll(es => es.map(e => e.getBoundingClientRect()).map(r => ({ l: r.left, r: r.right, t: r.top, b: r.bottom })))
  let overlaps = 0
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]
    if (a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t) overlaps++
  }
  expect(overlaps).toBe(0)
})
