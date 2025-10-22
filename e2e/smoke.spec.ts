import { test, expect } from '@playwright/test'

test.describe('Smoke Tests - Critical Features', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PDF Autofill SaaS/)
  })

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('signup page has password strength indicator', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()

    // Type a password to trigger strength indicator
    const passwordInput = page.getByLabel(/^password$/i)
    await passwordInput.fill('pass123')

    // Should show visual strength bars (check that bars container appears)
    // The strength indicator shows as colored bars, not text
    const strengthBars = page.locator('.h-1.flex-1.rounded-full')
    await expect(strengthBars.first()).toBeVisible()
  })

  test('skip link is present and accessible', async ({ page }) => {
    await page.goto('/')

    // Press Tab to focus skip link
    await page.keyboard.press('Tab')

    // Skip link should be visible when focused
    const skipLink = page.getByRole('link', { name: /skip to main content/i })
    await expect(skipLink).toBeFocused()
  })
})
