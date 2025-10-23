# Authentication Button Testing Checklist

## Quick Validation

Run this quick smoke test first:

```bash
cd /Users/g0m/Desktop/tramite/pdf-autofill-saas
npx playwright test quick-button-check.spec.ts
```

Expected output:
```
✓ Critical auth buttons exist and are clickable
1 passed (10s)
```

---

## Full Test Suite

Run complete test suite:

```bash
npm run test:e2e
```

Expected: **41 tests passing**

---

## Manual Verification Checklist

After tests pass, manually verify:

### Login Page (`http://localhost:3000/login`)

- [ ] Google sign-in button visible
- [ ] Google logo displays correctly (4-color)
- [ ] Button text: "Sign in with Google"
- [ ] Hover effect works (background change)
- [ ] Click opens Google OAuth popup/redirect
- [ ] Email sign-in button works
- [ ] Forgot password link works
- [ ] Sign up link works

### Signup Page (`http://localhost:3000/signup`)

- [ ] Google sign-up button visible
- [ ] Google logo displays correctly
- [ ] Button text: "Sign up with Google"
- [ ] Hover effect works
- [ ] Click opens Google OAuth popup/redirect
- [ ] Create account button works
- [ ] Password visibility toggles work
- [ ] Password strength indicator works
- [ ] Sign in link works

### Homepage (`http://localhost:3000/`)

- [ ] "Get Started Free" button visible
- [ ] Button links to `/signup`
- [ ] "View Demo" button visible
- [ ] Button links to `/dashboard`
- [ ] Both buttons have hover effects

---

## Keyboard Accessibility Test

Press `Tab` key to navigate:

### Login Page
1. Skip link (first tab)
2. Email input
3. Password input
4. Forgot password link
5. Email sign-in button
6. Google sign-in button ⭐
7. Sign up link

### Signup Page
1. Skip link
2. Full name input
3. Organization name input
4. Email input
5. Password input
6. Password toggle button
7. Confirm password input
8. Confirm password toggle button
9. Create account button
10. Google sign-up button ⭐
11. Sign in link

- [ ] All elements focusable in correct order
- [ ] Focus indicators visible (blue outline)
- [ ] Enter key activates buttons/links

---

## Mobile Responsiveness Test

### iPhone (375px width)

```bash
# Test mobile viewport
npx playwright test button-visual.spec.ts --grep "mobile"
```

Manual check on real device:
- [ ] Google button full width on mobile
- [ ] Touch targets ≥ 44px (easy to tap)
- [ ] Buttons don't overflow
- [ ] Text doesn't wrap awkwardly

---

## OAuth Configuration Verification

If button tests pass but OAuth still fails:

### Supabase Dashboard
1. Go to: https://app.supabase.com
2. Select your project
3. Navigate to: **Authentication → Providers**
4. Check Google OAuth:
   - [ ] Google provider enabled
   - [ ] Client ID filled
   - [ ] Client Secret filled
   - [ ] Redirect URL shows correctly

### Google Cloud Console
1. Go to: https://console.cloud.google.com
2. Navigate to: **APIs & Services → Credentials**
3. Find OAuth 2.0 Client ID
4. Check Authorized redirect URIs:
   - [ ] `http://localhost:3000/auth/callback` (dev)
   - [ ] `https://your-domain.com/auth/callback` (prod)

### Environment Variables
Check `.env.local`:
```bash
cat .env.local | grep SUPABASE
```

Should see:
- [ ] `NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...`

---

## Browser Console Test

1. Open DevTools (F12)
2. Go to login page
3. Click Google sign-in button
4. Check Console tab:
   - [ ] No red errors
   - [ ] No "OAuth provider not configured" errors
5. Check Network tab:
   - [ ] Request to `/auth/v1/authorize` succeeds
   - [ ] No 400/401/500 errors

---

## Screenshot Comparison

After running visual tests:

```bash
ls -la test-results/*.png
```

Review generated screenshots:
- [ ] `google-signin-button.png` looks correct
- [ ] `google-signup-button.png` looks correct
- [ ] Google logo visible in both
- [ ] Button text readable
- [ ] No layout issues

---

## Performance Check

Test button loading states:

### Login Page
1. Fill email: `test@example.com`
2. Fill password: `test123`
3. Click "Sign in with Email"
4. Button should show:
   - [ ] "Signing in..." text
   - [ ] Button disabled during loading

### Signup Page
1. Fill all fields
2. Click "Create account"
3. Button should show:
   - [ ] "Creating account..." text
   - [ ] Button disabled during loading

---

## Common Issues & Solutions

### Issue: Tests pass but button still doesn't work

**Solution**: The UI is correct. Issue is in OAuth configuration.
1. Check Supabase Google OAuth settings
2. Verify Google Cloud Console redirect URIs
3. Check browser console for specific errors

### Issue: Tests fail with timeout

**Solution**: Dev server not starting or slow network.
```bash
# Kill existing servers
pkill -f "next dev"

# Restart tests
npm run test:e2e
```

### Issue: Screenshots don't generate

**Solution**: Directory permissions or Playwright not installed.
```bash
# Reinstall Playwright
npx playwright install --with-deps
```

---

## Success Criteria

Tests are **PASSING** if:

✅ All 41 Playwright tests pass  
✅ Manual verification checklist complete  
✅ Keyboard navigation works  
✅ Mobile responsiveness confirmed  
✅ No console errors when clicking buttons  

OAuth is **WORKING** if:

✅ Google sign-in redirects to Google OAuth page  
✅ After Google login, user redirected back to app  
✅ User session created in Supabase  
✅ User can access protected routes (e.g., `/dashboard`)  

---

## Final Checklist

Before marking complete:

- [ ] Run full test suite: `npm run test:e2e`
- [ ] All 41 tests passing
- [ ] Manual verification complete
- [ ] Keyboard accessibility confirmed
- [ ] Mobile responsiveness verified
- [ ] OAuth configuration checked (if applicable)
- [ ] No console errors
- [ ] Visual screenshots reviewed

**If all checked**: ✅ **READY FOR PRODUCTION**

---

**Last Updated**: 2025-10-23  
**Maintained By**: QA Team  
**Framework**: Playwright
