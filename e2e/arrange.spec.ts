import { expect, test } from '@playwright/test'
import { addPictures, dragBy, dragSelectedTo, info, openApp, selected, settings, setWidthCm, stickers, toolbar } from './helpers'

// Scenario map C (adjusting a sticker) plus the floating toolbar, keyboard and undo

test('selecting shows the settings and a floating toolbar; dragging moves it', async ({ page }) => {
  await openApp(page)
  await stickers(page).first().click()
  await expect(settings(page).getByLabel('寬度')).toBeVisible()
  await expect(toolbar(page).getByRole('button')).toHaveText(['去背', '複製', '刪除'])
  const before = (await selected(page).boundingBox())!
  await dragBy(page, selected(page), 60, -40)
  const after = (await selected(page).boundingBox())!
  expect(after.x - before.x).toBeCloseTo(60, 0)
  await expect(toolbar(page)).toBeVisible()
})

test('the toolbar moves below a sticker that sits near the top of the door', async ({ page }) => {
  await openApp(page)
  await page.locator('.sticker[aria-label^="範例：旗子"]').click() // the flag sits near the top
  const bar = (await toolbar(page).boundingBox())!
  const s = (await selected(page).boundingBox())!
  expect(bar.y).toBeGreaterThan(s.y + s.height)
})

test('handles resize and rotate; rotation snaps to quarter turns and「轉正」resets it', async ({ page }) => {
  await openApp(page)
  await stickers(page).first().click()
  const width = settings(page).getByLabel('寬度')
  const w0 = Number(await width.inputValue())
  await dragBy(page, selected(page).getByTitle('拖曳縮放'), 40, 40)
  expect(Number(await width.inputValue())).toBeGreaterThan(w0)

  const s = (await selected(page).boundingBox())!
  const handle = (await selected(page).getByTitle('拖曳旋轉').boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(s.x + s.width / 2 + 150, s.y + s.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(settings(page).getByLabel('旋轉')).toHaveValue('90')
  await settings(page).getByRole('button', { name: '轉正' }).click()
  await expect(settings(page).getByLabel('旋轉')).toHaveValue('0')
})

test('arrow keys nudge (Shift = 1 cm) and ⌘Z puts it back', async ({ page }) => {
  await openApp(page)
  await stickers(page).first().focus()
  const before = (await selected(page).boundingBox())!.x
  await page.keyboard.press('Shift+ArrowRight')
  expect((await selected(page).boundingBox())!.x).toBeGreaterThan(before)
  await page.keyboard.press('Meta+z')
  expect((await selected(page).boundingBox())!.x).toBeCloseTo(before, 0)
})

test('C2 over the lock: only the most important message shows', async ({ page }) => {
  await openApp(page)
  await addPictures(page, 'tiny.png') // also too small to print sharp
  await dragSelectedTo(page, 0.85, 0.47)
  await expect(settings(page)).toContainText('擋到門把了，挪開一點。')
  await expect(settings(page)).not.toContainText('印出來會糊')
  await expect(selected(page)).toHaveClass(/outline-dashed/)
})

test('C3 a small picture warns it will print blurry; the examples never do', async ({ page }) => {
  await openApp(page)
  await stickers(page).first().click()
  await expect(settings(page)).not.toContainText('圖太小')
  await addPictures(page, 'tiny.png')
  await expect(settings(page)).toContainText('圖太小，印出來會糊。')
})

test('C4 too big for the paper: shrink fixes it; off the door too, both messages show', async ({ page }) => {
  await openApp(page)
  await addPictures(page, 'wide-banner.svg')
  await setWidthCm(page, 40)
  await expect(settings(page)).toContainText('超出門外了。')
  await expect(settings(page)).toContainText('A3 印不下。')
  await settings(page).getByRole('button', { name: /^縮到/ }).click()
  // it now fits; the off-the-door message still outranks the「一張印得完」line
  await expect(settings(page)).not.toContainText('印不下')
  await expect(settings(page)).toContainText('超出門外了。')
})

test('C5 delete then undo from the notice', async ({ page }) => {
  await openApp(page)
  await stickers(page).first().focus()
  await page.keyboard.press('Delete')
  await expect(stickers(page)).toHaveCount(2)
  await expect(info(page)).toContainText(/已刪除「.+」。/)
  await info(page).getByRole('button', { name: '復原' }).click()
  await expect(stickers(page)).toHaveCount(3)
})

test('the undo on a notice disappears once another change lands, so it never undoes the wrong step', async ({ page }) => {
  await openApp(page)
  await stickers(page).first().click()
  await toolbar(page).getByRole('button', { name: '刪除' }).click()
  await expect(info(page).getByRole('button', { name: '復原' })).toBeVisible()
  await stickers(page).first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(info(page).getByRole('button', { name: '復原' })).toBeHidden()
  await expect(stickers(page)).toHaveCount(2)
})

test('toolbar duplicate adds a copy; hovering the list highlights its sticker', async ({ page }) => {
  await openApp(page)
  await stickers(page).nth(1).click()
  await toolbar(page).getByRole('button', { name: '複製' }).click()
  await expect(stickers(page)).toHaveCount(4)
  await page.mouse.click(5, 5)
  await page.getByRole('region', { name: '貼紙清單' }).getByRole('button', { name: /範例：圓章/ }).hover()
  await expect(stickers(page).first()).toHaveClass(/outline-select\/70/)
})

test('a small sticker moves when dragged from its middle instead of being resized', async ({ page }) => {
  await openApp(page)
  await addPictures(page, 'tiny.png')
  await setWidthCm(page, 4)
  const width = await settings(page).getByLabel('寬度').inputValue()
  const before = (await selected(page).boundingBox())!
  await dragBy(page, selected(page), 50, 30)
  const after = (await selected(page).boundingBox())!
  expect(after.x - before.x).toBeCloseTo(50, 0)
  await expect(settings(page).getByLabel('寬度')).toHaveValue(width)
})
