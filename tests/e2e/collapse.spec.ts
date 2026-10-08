import { chromium, expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const signedImage = 'https://github.com/assets/tall.svg?token=fixture-only&signature=keep%2Bme';
const longTitle = 'Checkout_Regression_Comparison_Internationalisation_Review_2026-10-07_Final.png';

async function openExtensionFixture() {
  const extensionPath = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const inventory = await context.newPage();
  await inventory.goto('chrome://extensions');
  const extension = inventory.locator('extensions-item').filter({ hasText: 'PR Lens' });
  await expect(extension).toBeVisible();
  const extensionId = await extension.getAttribute('id');
  await context.route('https://github.com/**', async (route) => {
    if (route.request().resourceType() === 'image') {
      if (route.request().url().includes('failed')) {
        await route.fulfill({ status: 404, body: '' });
      } else {
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="2400"><rect width="400" height="2400" fill="#cde" /></svg>',
        });
      }
      return;
    }
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html data-color-mode="light"><head><style>
        body { margin: 20px; font: 16px/1.5 system-ui; }
        main { max-width: 700px; margin: auto; }
        img { max-width: 100%; }
        a { color: #0969da; }
        html[data-color-mode="dark"] { color: #e6edf3; background: #0d1117; }
        html[data-color-mode="dark"] a { color: #58a6ff; }
      </style></head><body><main>
        <nav aria-label="Fixture data"><button>Demo data</button><button>Worst case</button></nav>
        <article class="timeline-comment" id="issue-1"><div class="markdown-body">
          <p>Before screenshot</p>
          <p><a id="original" href="${signedImage}" target="_blank" rel="noopener noreferrer"><picture><img id="tall" src="${signedImage}" alt="Tall screenshot" width="400" height="2400" style="border: 1px solid blue"></picture></a></p>
          <p id="reading">The implementation notes you were reading.</p>
          <div id="images"></div>
          <img class="avatar" src="https://github.com/assets/avatar.svg" alt="Avatar" width="32" height="32">
          <img src="https://github.com/assets/badge.svg" alt="Badge" width="20" height="20">
          <img src="javascript:alert(1)" alt="Unsafe source">
          <form><textarea aria-label="Draft comment">Unsaved review</textarea><img src="https://github.com/assets/preview.svg" alt="Editor preview"></form>
          <p style="height: 1600px">More review notes</p>
        </div></article>
      </main></body></html>`,
    });
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const collapse = popup.getByRole('switch', { name: 'Collapse PR images' });
  await expect(collapse).toBeEnabled();
  const github = await context.newPage();
  const errors: string[] = [];
  github.on('pageerror', (error) => errors.push(error.message));
  await github.goto('https://github.com/example/project/pull/1');
  await installFixtureControls(github);
  return { context, popup, github, collapse, errors };
}

async function installFixtureControls(github: Page) {
  // Fixture-only controls swap data at the same DOM boundary as loaded GitHub comments.
  await github.evaluate((title) => {
    const images = document.querySelector('#images')!;
    const show = (worst: boolean) => {
      images.replaceChildren();
      if (!worst) return;
      for (const [alt, src, width, height] of [
        [title, 'wide', 2400, 200],
        ['王秀英 · レビュー 👩🏽‍💻', 'tall', 200, 2400],
        ['Failed screenshot', 'failed', 400, 200],
        ['', 'tall', 400, 200],
      ] as const) {
        const image = document.createElement('img');
        image.src = `https://github.com/assets/${src}.svg`;
        image.alt = alt;
        image.width = width;
        image.height = height;
        const paragraph = document.createElement('p');
        paragraph.append(image);
        images.append(paragraph);
      }
    };
    document.querySelector('nav button:first-child')!.addEventListener('click', () => show(false));
    document.querySelector('nav button:last-child')!.addEventListener('click', () => show(true));
  }, longTitle);
}

test('linked image actions survive nesting, keyboard activation, and collapse without entering the gallery', async () => {
  const { context, github, collapse, errors } = await openExtensionFixture();
  try {
    const variants = [
      { id: 'direct', tag: 'a', depth: 0 },
      { id: 'nested', tag: 'a', depth: 50 },
      { id: 'picture', tag: 'a', depth: 2, picture: true },
      { id: 'mixed', tag: 'a', depth: 1, text: true },
      { id: 'multiple', tag: 'a', depth: 1, multiple: true },
      { id: 'no-href', tag: 'a', depth: 3, noHref: true },
      {
        id: 'image-url-action',
        tag: 'a',
        depth: 5,
        href: 'https://github.com/assets/fix.svg?action=fix',
      },
      { id: 'aria-link', tag: 'span', depth: 5, role: 'link' },
      { id: 'button', tag: 'button', depth: 2 },
      { id: 'aria-button', tag: 'span', depth: 2, role: 'button' },
    ];
    await github.evaluate((cases) => {
      const body = document.querySelector('#images')!;
      for (const variant of cases) {
        const control = document.createElement(variant.tag);
        control.id = variant.id;
        control.tabIndex = 0;
        control.style.display = 'inline-block';
        control.style.padding = '12px';
        if (variant.tag === 'a' && !variant.noHref)
          control.setAttribute('href', variant.href ?? '#reading');
        if (variant.role) control.setAttribute('role', variant.role);
        if (variant.text) control.append('Fix issue');
        let parent = control;
        for (let i = 0; i < variant.depth; i++) {
          const wrapper = document.createElement('span');
          parent.append(wrapper);
          parent = wrapper;
        }
        if (variant.picture) {
          const picture = document.createElement('picture');
          parent.append(picture);
          parent = picture;
        }
        for (let i = 0; i < (variant.multiple ? 2 : 1); i++) {
          const image = document.createElement('img');
          image.src = 'https://github.com/assets/fix.svg';
          image.alt = `Fix issue ${variant.id} ${i}`;
          image.width = 80;
          image.height = 40;
          parent.append(image);
        }
        control.addEventListener('click', (event) => {
          control.dataset.preventedByLens = String(event.defaultPrevented);
          control.dataset.clicks = String(Number(control.dataset.clicks ?? 0) + 1);
          event.preventDefault(); // Stand in for a bot's fix action without navigating away.
        });
        const paragraph = document.createElement('p');
        paragraph.append(control);
        body.append(paragraph);
      }
    }, variants);

    for (const collapsed of [false, true]) {
      if (collapsed) await collapse.click();
      await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(collapsed ? 1 : 0);
      for (const variant of variants) {
        const control = github.locator(`#${variant.id}`);
        const image = control.locator('img').first();
        await expect(image).toBeVisible();
        const before = Number((await control.getAttribute('data-clicks')) ?? 0);
        await image.click();
        await expect(control).toHaveAttribute('data-clicks', String(before + 1));
        await expect(control).toHaveAttribute('data-prevented-by-lens', 'false');
        // Clicking link padding must also bypass the old image-only-anchor shortcut.
        await control.click({ position: { x: 2, y: 2 } });
        await expect(control).toHaveAttribute('data-clicks', String(before + 2));
        await expect(github.getByRole('dialog')).toHaveCount(0);
      }
      const direct = github.locator('#direct');
      const before = Number(await direct.getAttribute('data-clicks'));
      await direct.focus();
      await github.keyboard.press('Enter');
      await expect(direct).toHaveAttribute('data-clicks', String(before + 1));
      await expect(direct).toHaveAttribute('data-prevented-by-lens', 'false');
      await expect(direct).toBeFocused();
      await expect(github.getByRole('dialog')).toHaveCount(0);

      const opener = collapsed
        ? github.locator('[data-pr-lens-placeholder]')
        : github.locator('#tall');
      await opener.click();
      await expect(github.getByRole('dialog')).toHaveAccessibleName('Tall screenshot');
      await expect(github.locator('.lens-thumbnail')).toHaveCount(1);
      await github.keyboard.press('Escape');
      await expect(github.getByRole('dialog')).toBeHidden();
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('GitHub image wrappers open Lens while modified clicks and changed action destinations stay native', async () => {
  const { context, github, collapse, errors } = await openExtensionFixture();
  try {
    const image = github.locator('#tall');
    const original = github.locator('#original');
    const originalMarkup = await original.evaluate((node) => node.outerHTML);
    const dialog = github.getByRole('dialog');
    for (const activate of [
      async () => image.click(),
      async () => {
        await original.focus();
        await github.keyboard.press('Enter');
      },
      async () => {
        await original.evaluate((node) => {
          node.style.padding = '12px';
          node.style.display = 'inline-block';
        });
        await original.click({ position: { x: 2, y: 2 } });
      },
    ]) {
      await activate();
      await expect(dialog).toHaveAccessibleName('Tall screenshot');
      await expect(dialog.getByRole('link', { name: 'Open image in new tab' })).toHaveAttribute(
        'href',
        signedImage,
      );
      await github.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(original).toBeFocused();
    }
    await original.evaluate((node) => node.removeAttribute('style'));
    for (const collapsed of [false, true]) {
      if (collapsed) await collapse.click();
      const opener = collapsed ? github.locator('[data-pr-lens-placeholder]') : image;
      for (const options of [{ button: 'middle' as const }, { modifiers: ['Meta' as const] }]) {
        const newPage = context.waitForEvent('page');
        await opener.click(options);
        const destination = await newPage;
        await expect(destination).toHaveURL(signedImage);
        await expect(dialog).toBeHidden();
        await destination.close();
      }
    }
    // Changes to existing text nodes also turn an image-only wrapper into an action link.
    await original.evaluate((node) => node.append(document.createTextNode(' ')));
    await original.evaluate((node) => {
      node.lastChild!.textContent = 'Fix issue';
    });
    await expect(image).toBeVisible();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
    await original.evaluate((node) => {
      node.lastChild!.textContent = ' ';
    });
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    await original.evaluate((node) => node.lastChild!.remove());
    // The same image becomes ineligible when its link changes into an action.
    await original.evaluate((node) => node.setAttribute('href', '#reading'));
    await expect(image).toBeVisible();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
    await original.evaluate((node) => node.setAttribute('target', '_self'));
    await image.click();
    await expect(github).toHaveURL(/#reading$/);
    await expect(dialog).toBeHidden();
    await original.evaluate((node, url) => {
      node.setAttribute('href', url);
      node.setAttribute('target', '_blank');
    }, signedImage);
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    await github.locator('[data-pr-lens-placeholder]').click();
    await expect(dialog).toHaveAccessibleName('Tall screenshot');
    await github.keyboard.press('Escape');
    await collapse.click();
    await expect(image).toBeVisible();
    expect(await original.evaluate((node) => node.outerHTML)).toBe(originalMarkup);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('wrapping collapsed images or changing ancestor roles restores them and updates the gallery live', async () => {
  const { context, github, collapse, errors } = await openExtensionFixture();
  try {
    await collapse.click();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    await github.locator('#original').evaluate((original) => {
      const picture = original.querySelector('picture')!;
      const link = document.createElement('a');
      link.id = 'dynamic-link';
      link.href = '#reading';
      original.before(link);
      link.append(picture);
      original.remove();
    });
    await expect(github.locator('#tall')).toBeVisible();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
    await github.locator('#tall').click();
    await expect(github).toHaveURL(/#reading$/);
    await expect(github.getByRole('dialog')).toHaveCount(0);
    await github.locator('#dynamic-link').evaluate((link) => link.replaceWith(...link.childNodes));
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    // Role changes above .markdown-body also need to invalidate eligibility.
    for (const role of ['link', 'button']) {
      await github
        .locator('#issue-1')
        .evaluate((node, value) => node.setAttribute('role', value), role);
      await expect(github.locator('#tall')).toBeVisible();
      await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
      await github.locator('#issue-1').evaluate((node) => node.removeAttribute('role'));
      await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    }
    await github.locator('[data-pr-lens-placeholder]').click();
    await expect(github.getByRole('dialog')).toHaveAccessibleName('Tall screenshot');
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('collapse preserves reading position, sources, gallery access, preferences, and exclusions', async () => {
  const { context, popup, github, collapse, errors } = await openExtensionFixture();
  try {
    await expect(collapse).not.toBeChecked();
    const image = github.locator('#tall');
    await expect(image).toBeVisible();
    const originalMarkup = await github.locator('#original').evaluate((node) => node.outerHTML);
    const reading = github.locator('#reading');
    await reading.evaluate((node) => {
      window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 100);
    });
    const readingTop = (await reading.boundingBox())!.y;
    await collapse.click();
    const link = github.getByRole('link', {
      name: 'View in PR Lens · Tall screenshot',
      exact: true,
    });
    await expect(link).toBeVisible();
    await expect(image).toBeHidden();
    await expect.poll(async () => (await reading.boundingBox())!.y).toBeCloseTo(readingTop, 0);
    await expect(link).toHaveAttribute('href', signedImage);
    for (const alt of ['Avatar', 'Badge', 'Editor preview']) {
      await expect(github.getByRole('img', { name: alt, exact: true })).toBeVisible();
    }
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    await expect(github.getByRole('textbox', { name: 'Draft comment' })).toHaveValue(
      'Unsaved review',
    );
    await link.focus();
    await github.keyboard.press('Enter');
    const dialog = github.getByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Tall screenshot');
    await github.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(link).toBeFocused();

    await link.click();
    await expect(dialog).toBeVisible();
    await collapse.click();
    await expect(image).toBeVisible();
    await github.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(github.locator('#original')).toBeFocused();
    await collapse.click();
    await expect(link).toBeVisible();

    // Native modified and middle clicks open the original signed image, without opening Lens.
    for (const options of [{ button: 'middle' as const }, { modifiers: ['Meta' as const] }]) {
      const newPage = context.waitForEvent('page');
      await link.click(options);
      const destination = await newPage;
      await expect(destination).toHaveURL(signedImage);
      await expect(dialog).toBeHidden();
      await destination.close();
    }
    await popup.reload();
    await expect(collapse).toBeChecked();
    await github.reload();
    await installFixtureControls(github);
    await expect(link).toBeVisible();
    await expect(image).toBeHidden();
    await github.getByRole('button', { name: 'Worst case', exact: true }).click();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(5);
    await github
      .getByRole('link', { name: 'View in PR Lens · Failed screenshot', exact: true })
      .click();
    await expect(dialog.getByText('This image couldn’t load')).toBeVisible();
    await github.keyboard.press('Home');
    await expect(dialog).toHaveAccessibleName('Tall screenshot');
    await github.keyboard.press('Escape');

    mkdirSync('artifacts', { recursive: true });
    for (const mode of ['light', 'dark'] as const) {
      await github.evaluate(
        (value) => document.documentElement.setAttribute('data-color-mode', value),
        mode,
      );
      await popup
        .getByRole('radio', { name: mode === 'light' ? 'Light' : 'Dark', exact: true })
        .click();
      await github.setViewportSize({ width: 320, height: 720 });
      const longLink = github.getByRole('link', {
        name: `View in PR Lens · ${longTitle}`,
        exact: true,
      });
      await longLink.scrollIntoViewIfNeeded();
      await expect(longLink).toHaveAttribute('title', `View in PR Lens · ${longTitle}`);
      expect((await longLink.boundingBox())!.width).toBeLessThanOrEqual(280);
      expect(await github.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
      await github.screenshot({ path: `artifacts/collapse-${mode}-narrow.png` });
      await popup.locator('main').screenshot({ path: `artifacts/collapse-settings-${mode}.png` });
    }
    await github.emulateMedia({ reducedMotion: 'reduce' });
    await github.evaluate(() => {
      document.body.style.zoom = '2';
    });
    await github.screenshot({ path: 'artifacts/collapse-200-percent.png' });
    await link.focus();
    await collapse.click();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
    await expect(github.locator('#original')).toBeFocused();
    await expect(image).toBeVisible();
    expect(await github.locator('#original').evaluate((node) => node.outerHTML)).toBe(
      originalMarkup,
    );

    await collapse.click();
    await popup.getByRole('switch', { name: 'Enable PR Lens' }).click();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
    await expect(image).toBeVisible();
    await expect(collapse).toBeChecked();
    await popup.getByRole('switch', { name: 'Enable PR Lens' }).click();
    await expect(image).toBeHidden();
    await github.evaluate(() => {
      history.pushState({}, '', '/example/project/issues/1');
      document.dispatchEvent(new Event('turbo:load'));
    });
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
    await expect(image).toBeVisible();
    await github.evaluate(() => {
      history.pushState({}, '', '/example/project/pull/2');
      document.dispatchEvent(new Event('turbo:load'));
    });
    await expect(image).toBeHidden();
    await github.getByRole('button', { name: 'Demo data', exact: true }).click();
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    await github.locator('#original').evaluate((node) => node.remove());
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('collapsed galleries track source changes, mixed links, and many rendered images', async () => {
  const { context, github, collapse, errors } = await openExtensionFixture();
  try {
    await collapse.click();
    await github.evaluate(() => {
      const body = document.querySelector('#images')!;
      const link = document.createElement('a');
      link.href = '#reading';
      link.textContent = 'Related discussion';
      const image = document.createElement('img');
      image.src = 'https://github.com/assets/mixed.svg';
      image.alt = 'Mixed link screenshot';
      link.append(image);
      body.append(link);
      for (let i = 0; i < 1000; i++) {
        const entry = document.createElement('img');
        entry.src = 'https://github.com/assets/repeated.svg';
        entry.alt = `Screenshot ${i + 1}`;
        body.append(entry);
      }
    });
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1001);
    await expect(
      github.getByRole('link', { name: 'Related discussionMixed link screenshot', exact: true }),
    ).toBeVisible();
    await expect(
      github.getByRole('img', { name: 'Mixed link screenshot', exact: true }),
    ).toBeVisible();
    await expect(github.locator('a a')).toHaveCount(0);
    await github.locator('#tall').evaluate((node) => {
      node.setAttribute('alt', 'Updated title');
      node.setAttribute('src', 'https://github.com/assets/updated.svg?signature=preserved');
      node
        .closest('a')!
        .setAttribute('href', 'https://github.com/assets/updated.svg?signature=preserved');
    });
    const updated = github.getByRole('link', {
      name: 'View in PR Lens · Updated title',
      exact: true,
    });
    await expect(updated).toBeVisible();
    await updated.click();
    const dialog = github.getByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Updated title');
    await github.keyboard.press('End');
    await expect(dialog).toHaveAccessibleName('Screenshot 1000');
    await github.keyboard.press('Escape');
    await github.locator('#images').evaluate((node) => node.replaceChildren());
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    await collapse.click();
    await expect(github.locator('[data-pr-lens-collapsed]')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('PR lists stay untouched on fresh loads and navigation from an open viewer', async () => {
  const { context, popup, github, collapse, errors } = await openExtensionFixture();
  try {
    await collapse.click();
    await expect(collapse).toBeChecked();
    const listingUrl = 'https://github.com/developingright/PR-Lens/pulls';
    await github.goto(listingUrl);
    const image = github.locator('#tall');
    await expect(image).toBeVisible();
    await expect(github.locator('[data-pr-lens-placeholder], pr-lens')).toHaveCount(0);
    await github.evaluate(() => {
      document.documentElement.style.overflowAnchor = 'none';
      window.scrollTo(0, 360);
    });
    await popup.getByRole('radio', { name: 'Dark', exact: true }).click();
    await collapse.click();
    await expect(collapse).not.toBeChecked();
    await collapse.click();
    await expect(collapse).toBeChecked();
    await github.evaluate(async () => {
      document.querySelector('#tall')!.setAttribute('alt', 'List page image');
      document.dispatchEvent(new Event('turbo:load'));
      window.dispatchEvent(new Event('resize'));
      await new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      );
    });
    expect(await github.evaluate(() => scrollY)).toBe(360);
    await expect(github.locator('[data-pr-lens-placeholder], pr-lens')).toHaveCount(0);

    await github.goto('https://github.com/example/project/pull/1');
    await expect(github.locator('[data-pr-lens-placeholder]')).toHaveCount(1);
    await collapse.click();
    await expect(image).toBeVisible();
    await github.evaluate(() => {
      document.documentElement.style.overflowAnchor = 'none';
      window.scrollTo(0, 800);
    });
    await image.click({ position: { x: 100, y: 1000 } });
    await expect(github.getByRole('dialog')).toBeVisible();
    await github.evaluate((url) => {
      history.pushState({}, '', url);
      document.querySelector('main')!.replaceChildren();
      const content = document.createElement('div');
      content.style.height = '5000px';
      content.textContent = 'Pull request list';
      document.querySelector('main')!.append(content);
      window.scrollTo(0, 0);
      document.dispatchEvent(new Event('turbo:load'));
    }, listingUrl);
    await expect(github.getByRole('dialog')).toHaveCount(0);
    await expect(github.locator('pr-lens')).toHaveCount(0);
    await github.evaluate(async () => {
      await new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      );
    });
    expect(await github.evaluate(() => scrollY)).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('source jumps release the modal lock and allow scrolling and reopening images', async () => {
  const { context, github, collapse, errors } = await openExtensionFixture();
  try {
    await github.evaluate(() => {
      navigation.addEventListener('navigate', (event) => {
        if (new URL(event.destination.url).hash !== '#issue-1') return;
        const html = document.documentElement;
        const locked = [html, document.body].some((element) =>
          /hidden|clip/.test(getComputedStyle(element).overflowY),
        );
        html.setAttribute('data-source-navigation-locked', String(locked));
        const modal = document
          .querySelector('pr-lens')
          ?.shadowRoot?.querySelector('[role="dialog"]');
        html.setAttribute('data-source-navigation-modal', String(!!modal));
      });
    });
    for (const collapsed of [false, true]) {
      if (collapsed) {
        await github.emulateMedia({ reducedMotion: 'reduce' });
        await collapse.click();
        await expect(collapse).toBeChecked();
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const opener = collapsed
          ? github.getByRole('link', { name: 'View in PR Lens · Tall screenshot', exact: true })
          : github.locator('#tall');
        await opener.click();
        const dialog = github.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await github.locator('html').evaluate((element) => {
          element.removeAttribute('data-source-navigation-locked');
          element.removeAttribute('data-source-navigation-modal');
        });
        const source = dialog.getByRole('link', { name: 'Go to description', exact: true });
        if (attempt === 1) {
          await source.focus();
          await github.keyboard.press('Enter');
        } else {
          await source.click();
        }
        await expect(github.locator('html')).toHaveAttribute(
          'data-source-navigation-locked',
          'false',
        );
        await expect(github.locator('html')).toHaveAttribute(
          'data-source-navigation-modal',
          'false',
        );
        await expect(dialog).toHaveCount(0);
        await expect(github.locator('.lens-layer')).toHaveCount(0);
        await expect.poll(() => github.evaluate(() => location.hash)).toBe('');
        await expect(github.locator('#issue-1')).toBeInViewport();
        await expect
          .poll(() =>
            github.evaluate(() => ({
              html: getComputedStyle(document.documentElement).overflowY,
              body: getComputedStyle(document.body).overflowY,
            })),
          )
          .toEqual({ html: 'visible', body: 'visible' });
        const before = await github.evaluate(() => scrollY);
        await github.mouse.move(20, 600);
        await github.mouse.wheel(0, 240);
        await expect.poll(() => github.evaluate(() => scrollY)).toBeGreaterThan(before);
        await expect(github.getByRole('textbox', { name: 'Draft comment' })).toBeEnabled();
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('source navigation from Files waits for cleanup and permits reopening on Conversation', async () => {
  const { context, github, errors } = await openExtensionFixture();
  const states: { locked: boolean; modal: boolean }[] = [];
  try {
    await github.goto('https://github.com/example/project/pull/1/files');
    await github.exposeFunction('recordSourceNavigation', (locked: boolean, modal: boolean) => {
      states.push({ locked, modal });
    });
    await github.evaluate(() => {
      const header = document.createElement('header');
      const permalink = document.createElement('a');
      permalink.href = 'https://github.com/example/project/pull/1#issue-1';
      permalink.textContent = 'Timestamp';
      header.append(permalink);
      document.querySelector('#issue-1')!.prepend(header);
      navigation.addEventListener('navigate', (event) => {
        if (new URL(event.destination.url).pathname !== '/example/project/pull/1') return;
        const locked = [document.documentElement, document.body].some((element) =>
          /hidden|clip/.test(getComputedStyle(element).overflowY),
        );
        const modal = !!document
          .querySelector('pr-lens')
          ?.shadowRoot?.querySelector('[role="dialog"]');
        void (
          window as unknown as {
            recordSourceNavigation: (locked: boolean, modal: boolean) => Promise<void>;
          }
        ).recordSourceNavigation(locked, modal);
      });
    });
    await github.locator('#tall').click();
    const dialog = github.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const source = dialog.getByRole('link', { name: 'Go to description', exact: true });
    await expect(source).toHaveAttribute(
      'href',
      'https://github.com/example/project/pull/1#issue-1',
    );
    await source.click();
    await expect(github).toHaveURL('https://github.com/example/project/pull/1#issue-1');
    await expect(github.locator('pr-lens')).toHaveCount(0);
    expect(states).toEqual([{ locked: false, modal: false }]);
    await github.locator('#tall').click();
    await expect(dialog).toBeVisible();
    await github.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
