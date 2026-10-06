import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page), 'Unexpected browser runtime errors').toEqual([]);
});

async function openViewer(page: Page) {
  await page.getByRole('button', { name: 'Open viewer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  return dialog;
}

test('preview zoom, thumbnail navigation, keyboard browsing, and return focus', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openViewer(page);
  const image = page.getByTestId('stage-image');
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  const fitted = await image.boundingBox();
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect
    .poll(async () => (await image.boundingBox())?.width ?? 0)
    .toBeGreaterThan(fitted!.width);
  await dialog.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect
    .poll(async () => Math.round((await image.boundingBox())?.width ?? 0))
    .toBe(Math.round(fitted!.width));
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await dialog.getByRole('button', { name: 'Fit image to view', exact: true }).click();
  await expect
    .poll(async () => Math.round((await image.boundingBox())?.width ?? 0))
    .toBe(Math.round(fitted!.width));
  await dialog.getByRole('button', { name: /^View image 2:/ }).click();
  await expect(dialog).toHaveAccessibleName('Workspace overview · dark mode');
  await page.keyboard.press('ArrowRight');
  await expect(dialog).toHaveAccessibleName('Notification preferences');
  await page.keyboard.press('End');
  await expect(dialog).toHaveAccessibleName('Project activity and release details');
  await page.keyboard.press('Home');
  await expect(dialog).toHaveAccessibleName('Workspace overview · light mode');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open viewer', exact: true })).toBeFocused();
});

test('light, dark, and automatic themes with a persisted override', async ({ page }) => {
  await page.goto('/');
  let dialog = await openViewer(page);
  const layer = page.locator('.lens-layer');
  await dialog.getByRole('button', { name: 'Light theme', exact: true }).click();
  await expect(layer).toHaveAttribute('data-theme', 'light');
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/viewer-light.png' });
  await dialog.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(layer).toHaveAttribute('data-theme', 'dark');
  await dialog.getByRole('button', { name: /^View image 2:/ }).click();
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/viewer-dark.png' });
  await page.reload();
  dialog = await openViewer(page);
  await expect(dialog.getByRole('button', { name: 'Dark theme', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await dialog.getByRole('button', { name: 'Auto theme', exact: true }).click();
  await expect(layer).toHaveAttribute('data-theme', 'light');
});

test('location links close the gallery and land on the selected image discussion', async ({
  page,
}) => {
  for (const [number, hash, label] of [
    [1, '#description', 'Go to description'],
    [2, '#maya-comment', 'Go to comment'],
    [3, '#review', 'Go to comment'],
    [4, '#review', 'Go to comment'],
  ] as const) {
    await page.goto('/');
    const dialog = await openViewer(page);
    await dialog.getByRole('button', { name: new RegExp(`^View image ${number}:`) }).click();
    const imageTitle = await page.getByTestId('stage-image').getAttribute('alt');
    const location = dialog.getByRole('link', { name: label, exact: true });
    await expect(location).toHaveAttribute('href', hash);
    await location.click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
    const comment = page.locator(hash);
    await expect(comment).toBeInViewport();
    await expect(comment.getByRole('img', { name: imageTitle!, exact: true })).toBeVisible();
    expect(page.context().pages()).toHaveLength(1);
  }
});

test('worst-case images and long metadata keep controls usable at narrow widths', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Worst case', exact: true }).click();
  const dialog = await openViewer(page);
  for (const width of [1440, 720, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 720 : 1000 });
    for (const label of ['Close viewer', 'Zoom in', 'Next image', 'Dark theme']) {
      const control = dialog.getByRole('button', { name: label, exact: true });
      await expect(control).toBeInViewport();
      const controlBounds = await control.boundingBox();
      const dialogBounds = await dialog.boundingBox();
      expect(controlBounds!.x).toBeGreaterThanOrEqual(dialogBounds!.x);
      expect(controlBounds!.x + controlBounds!.width).toBeLessThanOrEqual(
        dialogBounds!.x + dialogBounds!.width,
      );
    }
    for (const number of [2, 3]) {
      await dialog.getByRole('button', { name: new RegExp(`^View image ${number}:`) }).click();
      await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
      const imageBounds = await page.getByTestId('stage-image').boundingBox();
      const stageBounds = await page.locator('.lens-stage').boundingBox();
      expect(imageBounds!.width).toBeLessThanOrEqual(stageBounds!.width);
      expect(imageBounds!.height).toBeLessThanOrEqual(stageBounds!.height);
      const controlsBounds = await dialog
        .getByRole('group', { name: 'Image controls', exact: true })
        .boundingBox();
      expect(controlsBounds!.y).toBeGreaterThanOrEqual(imageBounds!.y + imageBounds!.height);
      expect(controlsBounds!.y).toBeGreaterThanOrEqual(stageBounds!.y + stageBounds!.height);
    }
    await dialog.getByRole('button', { name: /^View image 1:/ }).click();
  }
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/viewer-narrow.png' });
  await dialog.getByRole('button', { name: /^View image 4:/ }).click();
  await expect(dialog.getByText('This image couldn’t load')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Next image', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(dialog).toHaveAccessibleName('Transparent design asset');
});

test('large galleries scroll the selected thumbnail into view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '1,000 images', exact: true }).click();
  const dialog = await openViewer(page);
  await page.keyboard.press('End');
  await expect(dialog).toHaveAccessibleName('Screenshot 1000');
  await expect(dialog.getByRole('button', { name: /^View image 1000:/ })).toBeInViewport();
  await page.keyboard.press('Home');
  await expect(dialog.getByRole('button', { name: /^View image 1:/ })).toBeInViewport();
});

test('adjacent navigation keeps its click targets and keyboard focus across images', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openViewer(page);
  const previous = dialog.getByRole('button', { name: 'Previous image', exact: true });
  const next = dialog.getByRole('button', { name: 'Next image', exact: true });
  const previousBounds = (await previous.boundingBox())!;
  const nextBounds = (await next.boundingBox())!;
  expect(nextBounds.x - previousBounds.x).toBeLessThanOrEqual(40);
  expect(nextBounds.y).toBe(previousBounds.y);
  await next.click();
  await expect(dialog).toHaveAccessibleName('Workspace overview · dark mode');
  await expect(next).toBeFocused();
  await page.keyboard.press('Space');
  await expect(dialog).toHaveAccessibleName('Notification preferences');
  await expect(next).toBeFocused();
  const after = (await next.boundingBox())!;
  expect(after.x).toBeCloseTo(nextBounds.x, 1);
  expect(after.y).toBeCloseTo(nextBounds.y, 1);
  await previous.click();
  await expect(dialog).toHaveAccessibleName('Workspace overview · dark mode');
});

test('wheel zoom anchors to the pointer, scrolling and dragging pan, double-click resets', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openViewer(page);
  const image = page.getByTestId('stage-image');
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  const original = (await image.boundingBox())!;
  const anchor = { x: original.x + original.width * 0.6, y: original.y + original.height * 0.6 };
  const pageState = await page.evaluate(() => ({ width: innerWidth, scroll: scrollY }));
  await page.mouse.move(anchor.x, anchor.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -120);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await image.boundingBox())!.width)
    .toBeGreaterThan(original.width * 1.5);
  const zoomed = (await image.boundingBox())!;
  expect((anchor.x - zoomed.x) / zoomed.width).toBeCloseTo(0.6, 2);
  expect((anchor.y - zoomed.y) / zoomed.height).toBeCloseTo(0.6, 2);
  await page.mouse.wheel(40, 30);
  await expect.poll(async () => (await image.boundingBox())!.x).toBeCloseTo(zoomed.x - 40, 1);
  const scrolled = (await image.boundingBox())!;
  await page.mouse.down();
  await page.mouse.move(anchor.x + 60, anchor.y + 40, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await image.boundingBox())!.x).toBeCloseTo(scrolled.x + 60, 1);
  expect(await page.evaluate(() => ({ width: innerWidth, scroll: scrollY }))).toEqual(pageState);
  await page.mouse.dblclick(anchor.x, anchor.y);
  await expect
    .poll(async () => Math.round((await image.boundingBox())!.width))
    .toBe(Math.round(original.width));
  await page.mouse.dblclick(anchor.x, anchor.y);
  await expect.poll(async () => (await image.boundingBox())!.width).toBeGreaterThan(original.width);
  await dialog.getByRole('button', { name: 'Fit image to view', exact: true }).click();
  await page.mouse.move(anchor.x, anchor.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 200);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => Math.round((await image.boundingBox())!.width))
    .toBe(Math.round(original.width));
});

test('touch pinch hands off to one-finger pan, cancellation and image switches clean up', async ({
  page,
}) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await page.goto('/');
  const dialog = await openViewer(page);
  const image = page.getByTestId('stage-image');
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  const original = (await image.boundingBox())!;
  const center = { x: original.x + original.width / 2, y: original.y + original.height / 2 };
  const touch = (x: number, y: number, id: number) => ({
    x,
    y,
    id,
    radiusX: 1,
    radiusY: 1,
    force: 1,
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touch(center.x - 60, center.y, 1), touch(center.x + 60, center.y, 2)],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [touch(center.x - 100, center.y, 1), touch(center.x + 100, center.y, 2)],
  });
  await expect
    .poll(async () => (await image.boundingBox())!.width)
    .toBeGreaterThan(original.width * 1.5);
  const pinched = (await image.boundingBox())!;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [touch(center.x + 100, center.y, 2)],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [touch(center.x - 70, center.y + 20, 1)],
  });
  await expect.poll(async () => (await image.boundingBox())!.x).toBeCloseTo(pinched.x + 30, 1);
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(
    page.getByRole('region', { name: 'Screenshot preview', exact: true }),
  ).toHaveAttribute('data-dragging', 'false');
  await dialog.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 10, center.y + 10);
  await page.mouse.up();
  await expect(
    page.getByRole('region', { name: 'Screenshot preview', exact: true }),
  ).toHaveAttribute('data-dragging', 'false');
  await client.detach();
});

test('loading and keyboard focus remain usable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/images/overview.svg', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const dialog = await openViewer(page);
    await expect(dialog.getByText('Loading screenshot…')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled();
    release();
    await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await expect
        .poll(() =>
          dialog.evaluate((element) => {
            const root = element.getRootNode() as ShadowRoot;
            return element.contains(root.activeElement);
          }),
        )
        .toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  } finally {
    release();
  }
});
