import { expect, test } from '@playwright/test';

test.describe('Guitar Pro reader app', () => {
  test('loads a .gp file in mock mode and allows playback controls', async ({ page }) => {
    await page.goto('/?mockEngine=1');
    await expect(page.getByRole('heading', { name: /on-device tablature and notation playback/i })).toBeVisible();
    await page.getByRole('button', { name: 'Load Mock GP File' }).click();

    await expect(page.getByText('Mock Song')).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Playhead' })).toBeVisible();
    await expect(page.getByLabel(/volume \(/i)).toBeVisible();

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    await page.getByRole('slider', { name: 'Playhead' }).evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '500';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  test('shows validation error for unsupported extension', async ({ page }) => {
    await page.goto('/?mockEngine=1');
    await expect(page.getByRole('heading', { name: /on-device tablature and notation playback/i })).toBeVisible();
    await page.getByRole('button', { name: 'Load Invalid File' }).click();

    await expect(page.getByRole('alert')).toContainText('Unsupported file format');
  });
});
