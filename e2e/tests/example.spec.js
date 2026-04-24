const { test, expect } = require('@playwright/test');

test('home page has title', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title).toContain('Smart Scan Storage');
});