import { expect, type Locator, type Page } from '@playwright/test'
import path from 'node:path'

export const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name)

export const stickers = (page: Page) => page.locator('.sticker')
export const selected = (page: Page) => page.locator('.sticker[aria-pressed="true"]')
export const settings = (page: Page) => page.getByRole('region', { name: '貼紙設定' })
export const toolbar = (page: Page) => page.getByRole('toolbar', { name: '貼紙工具' })
/** Success toasts are `status`, failures are `alert`. */
export const info = (page: Page) => page.getByRole('status')
export const failure = (page: Page) => page.getByRole('alert')

/** Open the app with the three example stickers on the door. */
export async function openApp(page: Page) {
  await page.goto('./')
  await expect(stickers(page)).toHaveCount(3)
}

export async function addPictures(page: Page, ...names: string[]) {
  await page.getByRole('region', { name: '貼紙清單' }).locator('input[type=file]').setInputFiles(names.map(fixture))
}

export async function openBackup(page: Page, name: string) {
  await page.locator('input[type=file][accept*=json]').setInputFiles(fixture(name))
}

export async function setWidthCm(page: Page, cm: number) {
  const input = settings(page).getByLabel('寬度')
  await input.fill(String(cm))
  await input.press('Enter')
}

/** Drag from the centre of `from` by (dx, dy) screen pixels. */
export async function dragBy(page: Page, from: Locator, dx: number, dy: number) {
  const b = (await from.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 8 })
  await page.mouse.up()
}

/** Drag the selected sticker so its centre lands at a fraction of the door's size. */
export async function dragSelectedTo(page: Page, fx: number, fy: number) {
  const door = (await page.getByRole('region', { name: '艙門' }).locator('div.relative').boundingBox())!
  const s = (await selected(page).boundingBox())!
  await dragBy(page, selected(page), door.x + door.width * fx - (s.x + s.width / 2), door.y + door.height * fy - (s.y + s.height / 2))
}

export const goToPrint = (page: Page) => page.getByRole('button', { name: /列印／下載 PDF/ }).click()
