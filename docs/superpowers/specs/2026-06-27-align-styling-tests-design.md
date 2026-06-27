# Design Document: Aligning Styling Tests with Responsiveness and Google Fonts

**Date:** 2026-06-27  
**Topic:** Aligning styling tests to reflect layout and font changes

## Status
- **Proposed:** 2026-06-27
- **Approved:** 2026-06-27

---

## 1. Problem Statement
The test suite in [src/styles.test.ts](file:///home/beerz/projects/kmitlnova/src/styles.test.ts) fails on two styling contracts:
1. `uses a split login layout with a remote KMITL image panel`: This test expects `.login-page` to use CSS Grid (`grid-template-rows: 1fr auto`, `height: 100dvh`, etc.). Recent commits refactored the login layout to use Flexbox to support better mobile responsiveness.
2. `loads Kanit from local fontsource package instead of external Google Fonts`: This test expects Google Fonts links to be absent from `index.html`. Recent commits reverted to Google Fonts to address FOUT (Flash of Unstyled Text) issues.

We need to align the styling contracts in `src/styles.test.ts` to expect the current responsive CSS layout and Google Fonts integration.

---

## 2. Proposed Changes

### 2.1 Update [src/styles.test.ts](file:///home/beerz/projects/kmitlnova/src/styles.test.ts)

#### Login Page Layout Assertions
Update the `.login-page` styling contract to assert Flexbox properties instead of Grid.
* **Old Assertions (to remove):**
  ```typescript
  expect(cssRule('.login-page')).toContain('grid-template-rows: 1fr auto');
  expect(cssRule('.login-page')).toContain('height: 100dvh');
  expect(cssRule('.login-page')).toContain('row-gap: 20px');
  expect(cssRule('.login-page')).toContain('overflow: hidden');
  expect(cssRule('.login-page .app-footer')).toContain('margin-top: 0');
  ```
* **New Assertions (to add):**
  ```typescript
  expect(cssRule('.login-page')).toContain('min-height: 100dvh');
  expect(cssRule('.login-page')).toContain('display: flex');
  expect(cssRule('.login-page')).toContain('flex-direction: column');
  expect(cssRule('.login-page')).toContain('align-items: center');
  expect(cssRule('.login-page')).toContain('padding: 24px');
  expect(cssRule('.login-page')).toContain('overflow-y: auto');
  expect(cssRule('.login-page')).toContain('overflow-x: hidden');
  expect(cssRule('.login-page .app-footer')).toContain('margin-top: 24px');
  ```

#### Kanit Font Loading Assertions
Rename the test to `'loads Kanit from external Google Fonts'` and verify the presence of Google Fonts links.
* **Old Assertions (to remove):**
  ```typescript
  expect(css).not.toContain('@import url("https://fonts.googleapis.com');
  expect(indexHtml).not.toContain('https://fonts.googleapis.com');
  expect(indexHtml).not.toContain('https://fonts.gstatic.com');
  ```
* **New Assertions (to add):**
  ```typescript
  expect(indexHtml).toContain('https://fonts.googleapis.com');
  expect(indexHtml).toContain('https://fonts.gstatic.com');
  ```

---

## 3. Verification Plan
1. Run the local test suite using `npm test` and verify that all tests pass successfully.
2. Verify that local development build (`npm run build`) compiles without error.
