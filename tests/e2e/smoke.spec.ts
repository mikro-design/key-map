import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for the map container to be visible
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 10000 });

    // Check that the title is correct
    await expect(page).toHaveTitle(/KeyMap/);
  });

  test('should open layer panel', async ({ page }) => {
    await page.goto('/');

    // Wait for map to load
    await page.waitForSelector('.maplibregl-canvas');

    // Click on layers button
    await page.click('text=Layers');

    // Should show "No layers added" message
    await expect(page.locator('text=No layers added yet')).toBeVisible();
  });

  test('should open upload dialog', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('.maplibregl-canvas');

    // Click upload data button
    await page.click('text=Upload Data');

    // Dialog should open
    await expect(page.locator('text=Add Data Layer')).toBeVisible();
  });

  test('should switch basemaps', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('.maplibregl-canvas');

    // Click basemap selector
    await page.click('button:has-text("Basemap")');

    // Should show basemap options
    await expect(page.locator('text=Street Maps')).toBeVisible();
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('.maplibregl-canvas');
    await canvas.waitFor({ state: 'visible' });

    // Map should be interactive
    await expect(canvas).toBeVisible();
    
    // Check for zoom controls
    await expect(page.locator('.maplibregl-ctrl-zoom-in')).toBeVisible();
    await expect(page.locator('.maplibregl-ctrl-zoom-out')).toBeVisible();
  });
});
