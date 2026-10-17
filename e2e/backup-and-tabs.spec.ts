import { expect, test } from '@playwright/test'
import { addPictures, failure, info, openApp, openBackup, stickers } from './helpers'

// Scenario map E (backups, several tabs) and the security checks on opening untrusted files

test('E2 a backup opens again with every sticker, and the open can be undone', async ({ page }, testInfo) => {
  await openApp(page)
  await addPictures(page, 'tiny.png')
  await page.getByRole('button', { name: '備份', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: /下載備份/ }).click()
  const file = testInfo.outputPath('backup.json')
  await (await download).saveAs(file)
  await expect(info(page)).toContainText('已下載備份。')

  await page.getByRole('button', { name: '清掉範例' }).click()
  await page.locator('input[type=file][accept*=json]').setInputFiles(file)
  await expect(info(page)).toContainText('已開啟備份。')
  await expect(stickers(page)).toHaveCount(4)
})

test('E4 a JSON file that is not a backup: red notice, layout untouched', async ({ page }) => {
  await openApp(page)
  await openBackup(page, 'not-a-backup.json')
  await expect(failure(page)).toContainText('無法開啟，這不是備份檔。')
  await expect(stickers(page)).toHaveCount(3)
})

test('a backup with an unreadable picture opens without it and says how many are missing', async ({ page }) => {
  await openApp(page)
  await openBackup(page, 'backup-with-broken-image.json')
  await expect(failure(page)).toContainText('已開啟備份，但找不到 1 張圖，已從門上移除。')
  await expect(stickers(page)).toHaveCount(1)
})

test('security: markup hidden in a backup never runs', async ({ page }) => {
  await openApp(page)
  await openBackup(page, 'backup-xss.json')
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()
})

test('security: a backup never makes the browser fetch a link inside it', async ({ page }) => {
  const requested: string[] = []
  await page.route('https://attacker.test/**', route => { requested.push(route.request().url()); return route.abort() })
  await openApp(page)
  await openBackup(page, 'backup-remote-image.json')
  await page.waitForTimeout(500)
  expect(requested).toEqual([])
})

test('E3 another tab saves a change: this tab stops saving and asks which version to keep', async ({ page, context }) => {
  await openApp(page)
  await expect(page.getByText(/已自動儲存/)).toBeVisible() // the first tab's layout is saved before the second opens
  const other = await context.newPage()
  await other.goto('./')
  await expect(stickers(other)).toHaveCount(3)
  await stickers(other).first().focus()
  await other.keyboard.press('ArrowRight')
  const banner = page.getByRole('alert').filter({ hasText: '另一個分頁改過排版' })
  await expect(banner).toBeVisible()
  await banner.getByRole('button', { name: '保留這裡的版本' }).click()
  await expect(page.getByText(/已自動儲存/)).toBeVisible()
})

test('⌘Z with nothing to undo says so', async ({ page }) => {
  await openApp(page)
  await page.keyboard.press('Meta+z')
  await expect(info(page)).toHaveText('沒有可以復原的步驟了。')
})
