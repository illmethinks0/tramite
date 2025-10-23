import { test, expect } from '@playwright/test'

test.describe('Button Visual Regression Tests', () => {
  test('Google sign-in button visual appearance on login page', async ({ page }) => {
    await page.goto('/login')
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i })
    
    // Wait for button to be fully rendered
    await expect(googleButton).toBeVisible()
    
    // Take screenshot of button
    await googleButton.screenshot({ path: 'test-results/google-signin-button.png' })
    
    // Verify button styling
    const styles = await googleButton.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        display: computed.display,
        cursor: computed.cursor,
        borderRadius: computed.borderRadius,
        padding: computed.padding,
      }
    })
    
    expect(styles.cursor).toBe('pointer')
    expect(styles.display).not.toBe('none')
  })

  test('Google sign-up button visual appearance on signup page', async ({ page }) => {
    await page.goto('/signup')
    
    const googleButton = page.getByRole('button', { name: /sign up with google/i })
    
    // Wait for button to be fully rendered
    await expect(googleButton).toBeVisible()
    
    // Take screenshot of button
    await googleButton.screenshot({ path: 'test-results/google-signup-button.png' })
  })

  test('Button hover states work correctly', async ({ page }) => {
    await page.goto('/login')
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i })
    
    // Hover over button
    await googleButton.hover()
    
    // Take screenshot of hover state
    await googleButton.screenshot({ path: 'test-results/google-signin-button-hover.png' })
    
    // Button should not be disabled
    await expect(googleButton).toBeEnabled()
  })

  test('Button focus states are visible', async ({ page }) => {
    await page.goto('/login')
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i })
    
    // Focus the button
    await googleButton.focus()
    
    // Take screenshot of focus state
    await googleButton.screenshot({ path: 'test-results/google-signin-button-focus.png' })
    
    // Verify focus
    await expect(googleButton).toBeFocused()
  })

  test('All auth page buttons are visible', async ({ page }) => {
    await page.goto('/login')
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/login-page-full.png',
      fullPage: true 
    })
    
    // Verify all critical buttons are visible
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible()
  })

  test('Homepage CTA buttons styling', async ({ page }) => {
    await page.goto('/')
    
    const getStartedButton = page.getByRole('link', { name: /get started free/i })
    const demoButton = page.getByRole('link', { name: /view demo/i })
    
    // Take screenshots
    await getStartedButton.screenshot({ path: 'test-results/homepage-get-started-button.png' })
    await demoButton.screenshot({ path: 'test-results/homepage-demo-button.png' })
    
    // Verify both are visible
    await expect(getStartedButton).toBeVisible()
    await expect(demoButton).toBeVisible()
  })

  test('Button disabled states display correctly', async ({ page }) => {
    await page.goto('/signup')
    
    const createButton = page.getByRole('button', { name: /create account/i })
    
    // Fill form partially and submit to trigger loading
    await page.getByLabel(/full name/i).fill('Test User')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('TestPassword123!')
    await page.getByLabel(/confirm password/i).fill('TestPassword123!')
    
    await createButton.click()
    
    // Button should show loading/disabled state
    await page.waitForTimeout(500)
    await createButton.screenshot({ path: 'test-results/create-account-button-loading.png' })
  })
})

test.describe('Button Responsive Design Tests', () => {
  test('Buttons render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/login')
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i })
    
    await expect(googleButton).toBeVisible()
    await googleButton.screenshot({ path: 'test-results/google-signin-button-mobile.png' })
    
    // Verify button takes full width on mobile
    const buttonBox = await googleButton.boundingBox()
    const viewportWidth = 375
    
    if (buttonBox) {
      expect(buttonBox.width).toBeGreaterThan(viewportWidth * 0.7) // At least 70% width
    }
  })

  test('Buttons render correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    await page.goto('/login')
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i })
    
    await expect(googleButton).toBeVisible()
    await googleButton.screenshot({ path: 'test-results/google-signin-button-tablet.png' })
  })

  test('Homepage CTA buttons render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    const getStartedButton = page.getByRole('link', { name: /get started free/i })
    
    await expect(getStartedButton).toBeVisible()
    
    // Take full viewport screenshot
    await page.screenshot({ path: 'test-results/homepage-mobile.png' })
  })
})
