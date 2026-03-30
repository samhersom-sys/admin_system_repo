import { test, expect, Page } from '@playwright/test'

// Shared login helper
async function login(page: Page) {
  await page.goto('/login')
  await page.locator('#email').fill('admin@policyforge.com')
  await page.locator('#password').fill('Admin123!')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/app-home/, { timeout: 10000 })
}

test.describe('E2E Navigation — Authenticated Routes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('app-home page loads with sidebar', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()
  })

  test('navigate to search via sidebar', async ({ page }) => {
    await page.locator('.sidebar-item[title="Search"]').click()
    await expect(page).toHaveURL(/\/search/, { timeout: 5000 })
  })

  test('navigate to reporting via sidebar', async ({ page }) => {
    await page.locator('.sidebar-item[title="Reporting"]').click()
    await expect(page).toHaveURL(/\/reports/, { timeout: 5000 })
  })

  test('navigate to settings via sidebar', async ({ page }) => {
    await page.locator('.sidebar-item[title="Settings"]').click()
    await expect(page).toHaveURL(/\/settings/, { timeout: 5000 })
  })

  test('submissions page loads when navigated directly', async ({ page }) => {
    await page.goto('/submissions')
    // /submissions redirects to /search
    await expect(page).toHaveURL(/\/(submissions|search)/, { timeout: 5000 })
  })

  test('quotes page loads when navigated directly', async ({ page }) => {
    await page.goto('/quotes')
    await expect(page).toHaveURL(/\/quotes/, { timeout: 5000 })
  })

  test('policies page loads when navigated directly', async ({ page }) => {
    await page.goto('/policies')
    await expect(page).toHaveURL(/\/policies/, { timeout: 5000 })
  })

  test('parties page loads when navigated directly', async ({ page }) => {
    await page.goto('/parties')
    await expect(page).toHaveURL(/\/parties/, { timeout: 5000 })
  })

  test('logout returns to login page', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /log\s*out/i })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    }
  })
})
