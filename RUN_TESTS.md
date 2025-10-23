# Quick Test Execution Guide

## Prerequisites

```bash
cd /Users/g0m/Desktop/tramite/pdf-autofill-saas
npm install
npx playwright install chromium
```

## Run All Tests

```bash
npm run test:e2e
```

## Run Specific Test Files

```bash
# Auth button tests (26 tests)
npx playwright test auth-buttons.spec.ts

# Visual regression tests (10 tests)
npx playwright test button-visual.spec.ts

# Quick smoke test (1 test)
npx playwright test quick-button-check.spec.ts

# Original smoke tests (4 tests)
npx playwright test smoke.spec.ts
```

## Interactive Mode

```bash
npm run test:e2e:ui
```

## View Test Report

```bash
npx playwright show-report
```

## Debug Failing Tests

```bash
# Run in debug mode
npx playwright test --debug

# Run specific test
npx playwright test auth-buttons.spec.ts --grep "Google sign-in button"

# Show browser
npx playwright test --headed
```

## Check Test Results

```bash
# View test results directory
ls -la test-results/

# View screenshots
open test-results/

# View HTML report
open playwright-report/index.html
```

## Expected Output

```
Running 41 tests using 1 worker

✓ auth-buttons.spec.ts:4:1 › Google sign-in button is visible and enabled
✓ auth-buttons.spec.ts:10:1 › Google sign-in button has correct structure
... (more tests)

41 passed (90s)
```

## Troubleshooting

### Dev server won't start
```bash
# Kill existing dev servers
pkill -f "next dev"

# Try again
npm run test:e2e
```

### Tests timeout
```bash
# Increase timeout
npx playwright test --timeout=60000
```

### Browser not found
```bash
# Reinstall browsers
npx playwright install --with-deps
```

## Test File Locations

```
e2e/
├── auth-buttons.spec.ts          # Main auth button tests (26)
├── button-visual.spec.ts         # Visual regression (10)
├── quick-button-check.spec.ts    # Smoke test (1)
└── smoke.spec.ts                 # Original smoke tests (4)
```

## CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```
