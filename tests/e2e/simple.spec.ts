import { test, expect } from '@playwright/test';

test.describe('Simple Page Tests', () => {
  test('should load the simple test page', async ({ page }) => {
    await page.goto('/simple');

    // Check that the title is visible
    await expect(page.locator('text=KeyMap - Simple Map Test')).toBeVisible();
    await expect(page.locator('text=This is a basic OpenStreetMap view')).toBeVisible();
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/simple');

    await expect(page).toHaveTitle(/KeyMap/);
  });

  test('should render without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/simple');

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Check there are no console errors
    expect(errors.length).toBe(0);
  });
});
