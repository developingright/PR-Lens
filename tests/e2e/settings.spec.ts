import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('toolbar settings persist and update image interception and open viewers', async () => {
  const extensionPath = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });

  try {
    const inventory = await context.newPage();
    await inventory.goto('chrome://extensions');
    const extension = inventory.locator('extensions-item').filter({ hasText: 'PR Lens' });
    await expect(extension).toBeVisible();
    const extensionId = await extension.getAttribute('id');
    expect(extensionId).toBeTruthy();

    await context.route('https://github.com/**', async (route) => {
      if (route.request().resourceType() === 'image') {
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#ddd" /></svg>',
        });
      } else {
        await route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html data-color-mode="light"><body><article class="timeline-comment" id="issue-1"><div class="markdown-body"><a href="#native-image"><img src="https://github.com/assets/screenshot.svg" alt="Settings test screenshot" width="400" height="250"></a></div></article><div id="native-image">Original destination</div></body></html>',
        });
      }
    });

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    const enabled = popup.getByRole('switch', { name: 'Enable PR Lens' });
    await expect(enabled).toBeEnabled();
    await expect(enabled).toBeChecked();
    await expect(popup.getByRole('radio', { name: 'Auto', exact: true })).toBeChecked();

    const github = await context.newPage();
    await github.goto('https://github.com/example/project/pull/1');
    const screenshot = github.getByRole('img', { name: 'Settings test screenshot', exact: true });
    await screenshot.click();
    const dialog = github.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await popup.getByRole('radio', { name: 'Dark', exact: true }).click();
    await expect(popup.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
    await expect(github.locator('.lens-layer')).toHaveAttribute('data-theme', 'dark');
    await popup.locator('main').screenshot({ path: 'artifacts/settings-dark.png' });
    await popup.reload();
    await expect(popup.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();

    await enabled.click();
    await expect(enabled).not.toBeChecked();
    await expect(dialog).toBeHidden();
    await screenshot.click();
    await expect(github).toHaveURL(/#native-image$/);
    await popup.reload();
    await expect(enabled).not.toBeChecked();
    await github.reload();
    await screenshot.click();
    await expect(dialog).toHaveCount(0);

    await enabled.click();
    await expect(enabled).toBeChecked();
    await expect(enabled).toBeEnabled();
    await screenshot.click();
    await expect(dialog).toBeVisible();
    await expect(github.locator('.lens-layer')).toHaveAttribute('data-theme', 'dark');
    await popup.getByRole('radio', { name: 'Light', exact: true }).click();
    await expect(popup.getByRole('radio', { name: 'Light', exact: true })).toBeChecked();
    await expect(github.locator('.lens-layer')).toHaveAttribute('data-theme', 'light');
    await popup.locator('main').screenshot({ path: 'artifacts/settings-light.png' });

    await dialog.getByRole('button', { name: 'Auto theme', exact: true }).click();
    await expect(popup.getByRole('radio', { name: 'Auto', exact: true })).toBeChecked();
    await expect(github.locator('.lens-layer')).toHaveAttribute('data-theme', 'light');
  } finally {
    await context.close();
  }
});
