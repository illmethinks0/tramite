import { test, expect } from '@playwright/test'

test.describe('Quick Button Functionality Check', () => {
  test('Critical auth buttons exist and are clickable', async ({ page }) => {
    // Check login page
    await page.goto('/login')
    
    const loginGoogleBtn = page.getByRole('button', { name: /sign in with google/i })
    const loginEmailBtn = page.getByRole('button', { name: /sign in with email/i })
    
    console.log('✓ Checking login page buttons...')
    await expect(loginGoogleBtn).toBeVisible()
    await expect(loginGoogleBtn).toBeEnabled()
    await expect(loginEmailBtn).toBeVisible()
    await expect(loginEmailBtn).toBeEnabled()
    console.log('✓ Login page: Google and Email buttons are visible and enabled')
    
    // Check signup page
    await page.goto('/signup')
    
    const signupGoogleBtn = page.getByRole('button', { name: /sign up with google/i })
    const signupCreateBtn = page.getByRole('button', { name: /create account/i })
    
    console.log('✓ Checking signup page buttons...')
    await expect(signupGoogleBtn).toBeVisible()
    await expect(signupGoogleBtn).toBeEnabled()
    await expect(signupCreateBtn).toBeVisible()
    await expect(signupCreateBtn).toBeEnabled()
    console.log('✓ Signup page: Google and Create Account buttons are visible and enabled')
    
    // Check homepage
    await page.goto('/')
    
    const getStartedBtn = page.getByRole('link', { name: /get started free/i })
    const demoBtn = page.getByRole('link', { name: /view demo/i })
    
    console.log('✓ Checking homepage CTA buttons...')
    await expect(getStartedBtn).toBeVisible()
    await expect(demoBtn).toBeVisible()
    console.log('✓ Homepage: Get Started and View Demo buttons are visible')
    
    console.log('\n✅ ALL CRITICAL BUTTONS PASSED!\n')
  })
})
