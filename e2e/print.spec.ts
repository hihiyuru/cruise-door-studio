import { expect, test } from '@playwright/test'
import { addPictures, failure, goToPrint, info, openApp, settings, setWidthCm } from './helpers'

// Scenario map D (printing)

const printPanel = (page: import('@playwright/test').Page) => page.getByRole('region', { name: '印刷設定' })

test('D3 downloading a PDF gives one file named after the paper', async ({ page }) => {
  await openApp(page)
  await goToPrint(page)
  const download = page.waitForEvent('download')
  await printPanel(page).getByRole('button', { name: '下載 PDF' }).click()
  expect((await download).suggestedFilename()).toMatch(/^艙門貼紙_ibon-A3_1張\.pdf$/)
  await expect(info(page)).toHaveText('已下載 PDF。')
})

test('D4 a sticker too big for the paper is listed with shrink and split', async ({ page }) => {
  await openApp(page)
  await addPictures(page, 'wide-banner.svg')
  await setWidthCm(page, 40)
  await goToPrint(page)
  await expect(printPanel(page)).toContainText('這幾張 A3 印不下：')
  await printPanel(page).getByRole('button', { name: '分成幾張印' }).click()
  await expect(info(page)).toContainText(/已分成 \d+ 張印。/)
  await expect(printPanel(page)).not.toContainText('印不下')
})

test('D6 nothing on the door: an empty message and a disabled download', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: '清掉範例' }).click()
  await goToPrint(page)
  await expect(printPanel(page)).toContainText('門上還沒有貼紙。')
  await expect(printPanel(page).getByRole('button', { name: '下載 PDF' })).toBeDisabled()
})

test('D9 running out of memory while making the PDF: a red notice in plain words', async ({ page }) => {
  await openApp(page)
  await goToPrint(page)
  await page.evaluate(() => { HTMLCanvasElement.prototype.toDataURL = () => { throw new RangeError('Array buffer allocation failed') } })
  await printPanel(page).getByRole('button', { name: '下載 PDF' }).click()
  await expect(failure(page)).toContainText('記憶體不足，無法產生 PDF。先縮小最大的幾張。')
  await expect(printPanel(page).getByRole('button', { name: '下載 PDF' })).toBeEnabled()
})

test('the print setting in the top bar and the print step stay in sync', async ({ page }) => {
  await openApp(page)
  const picker = page.getByRole('button', { name: /印在/ })
  await expect(picker).toContainText('7-11 ibon・A3')
  await picker.click()
  const dialog = page.getByRole('dialog', { name: '列印地點與紙張' })
  await dialog.getByRole('radio', { name: '印刷店' }).click()
  await dialog.getByRole('combobox').selectOption('a1')
  await expect(picker).toContainText('印刷店・A1')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /範例：圓章/ }).first().click()
  await expect(settings(page)).toContainText('A1 一張印得完。')
  await goToPrint(page)
  await expect(printPanel(page).getByRole('radio', { name: '印刷店' })).toHaveAttribute('aria-checked', 'true')
  await expect(printPanel(page).getByRole('combobox')).toHaveValue('a1')
})
