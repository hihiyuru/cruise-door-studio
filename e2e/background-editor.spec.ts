import { expect, test, type Page } from '@playwright/test'
import { addPictures, failure, info, openApp, toolbar } from './helpers'

// Scenario map C6–C9 (background removal)

async function openEditor(page: Page) {
  await openApp(page)
  await addPictures(page, 'white-background.png')
  await toolbar(page).getByRole('button', { name: '去背' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
const canvas = (page: Page) => page.getByRole('dialog').locator('canvas')
async function clickCanvas(page: Page, fx: number, fy: number) {
  const b = (await canvas(page).boundingBox())!
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy)
}

test('C6 with edits, clicking outside or Esc keeps the editor open; Cancel closes it', async ({ page }) => {
  await openEditor(page)
  await page.getByRole('button', { name: '自動去背' }).click()
  await page.mouse.click(5, 5)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(info(page)).toHaveText('還沒套用。按「套用」保留，按「取消」放棄。')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('C6b without edits, clicking outside just closes', async ({ page }) => {
  await openEditor(page)
  await page.mouse.click(5, 5)
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('C7 clicking where the background is already gone says so', async ({ page }) => {
  await openEditor(page)
  await page.getByRole('button', { name: '自動去背' }).click()
  await clickCanvas(page, 0.03, 0.03)
  await expect(info(page)).toHaveText('這裡沒有背景了。')
})

test('C8 removing everything blocks Apply with a red notice and keeps the editor open', async ({ page }) => {
  await openEditor(page)
  await page.getByRole('dialog').getByRole('slider').fill('80')
  await page.getByRole('dialog').getByRole('checkbox').check()
  await clickCanvas(page, 0.03, 0.03)
  await clickCanvas(page, 0.5, 0.5)
  await page.getByRole('button', { name: '套用' }).click()
  await expect(failure(page)).toContainText('整張都被去掉了，按「上一步」。')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('applying a background removal can be undone from the notice', async ({ page }) => {
  await openEditor(page)
  await page.getByRole('button', { name: '自動去背' }).click()
  await page.getByRole('button', { name: '套用' }).click()
  await expect(info(page)).toContainText('已去背。')
  await expect(page.getByRole('dialog')).toBeHidden()
})
