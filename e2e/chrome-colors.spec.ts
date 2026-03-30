import { test, expect } from '@playwright/test'

async function getCSSVar(page: import('@playwright/test').Page, varName: string) {
  return page.evaluate((v) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(v)
      .trim()
      .toLowerCase()
  }, varName)
}

test.describe('E2E Chrome Surface Colours', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
  })

  test('--color-chrome-text resolves to #ffffff', async ({ page }) => {
    const value = await getCSSVar(page, '--color-chrome-text')
    expect(value).toBe('#ffffff')
  })

  test('--sidebar-text resolves to #ffffff', async ({ page }) => {
    const value = await getCSSVar(page, '--sidebar-text')
    expect(value).toBe('#ffffff')
  })

  test('--sidebar-bg resolves to #111826', async ({ page }) => {
    const value = await getCSSVar(page, '--sidebar-bg')
    expect(value).toBe('#111826')
  })

  test('--color-brand resolves to #56c8b1', async ({ page }) => {
    const value = await getCSSVar(page, '--color-brand')
    expect(value).toBe('#56c8b1')
  })

  test('--ui-login-bg resolves to #111826', async ({ page }) => {
    const value = await getCSSVar(page, '--ui-login-bg')
    expect(value).toBe('#111826')
  })
})
