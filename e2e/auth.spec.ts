import { test, expect } from '@playwright/test'

test.describe('E2E Authentication Flow', () => {
  test('login page displays correctly', async ({ page }) => {
    await page.goto('/')

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/)

    // Heading and subheading
    const heading = page.getByRole('heading', { name: 'PolicyForge' })
    await expect(heading).toBeVisible()

    const subheading = page.getByText('Sign in to your account')
    await expect(subheading).toBeVisible()

    // Form fields are present
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill('wrong@example.com')
    await page.locator('#password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Should show an error alert
    const alert = page.locator('[role="alert"]')
    await expect(alert).toBeVisible({ timeout: 5000 })
  })

  test('successful login navigates to app-home', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill('admin@policyforge.com')
    await page.locator('#password').fill('Admin123!')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Should navigate to /app-home
    await expect(page).toHaveURL(/\/app-home/, { timeout: 10000 })
  })

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/submissions')
    await expect(page).toHaveURL(/\/login/)
  })

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login')

    const passwordInput = page.locator('#password')
    await passwordInput.fill('testpassword')

    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click show password
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // Click hide password
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
