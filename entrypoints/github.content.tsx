import { createRoot } from 'react-dom/client';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { browser } from 'wxt/browser';
import { GalleryStore } from '../src/gallery/model';
import { createImageCollapse, isCollapseMutation } from '../src/github/collapse';
import {
  affectsImages,
  clickedImage,
  discoverImages,
  pullRequestKey,
  type DiscoveredImage,
} from '../src/github/discovery';
import { createThemeStore } from '../src/theme/store';
import { Viewer } from '../src/viewer/Viewer';
import '../src/viewer/viewer.css';

export default defineContentScript({
  matches: ['https://github.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',

  main(ctx) {
    const gallery = new GalleryStore();
    const collapse = createImageCollapse(document);
    const theme = createThemeStore(document, {
      load: async () => (await browser.storage.local.get('theme')).theme,
      save: async (value) => {
        await browser.storage.local.set({ theme: value });
      },
      subscribe: (listener) => {
        const changed: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
          changes,
          area,
        ) => {
          if (area === 'local' && changes.theme) listener(changes.theme.newValue);
        };
        browser.storage.onChanged.addListener(changed);
        return () => browser.storage.onChanged.removeListener(changed);
      },
    });
    let entries: DiscoveredImage[] = [];
    let lastPath = location.pathname;
    let frame: number | null = null;
    let disposed = false;
    let enabled = false;
    let enabledChanged = false;
    let collapseImages = false;
    let collapseChanged = false;
    let uiGeneration = 0;
    let uiPromise: Promise<Awaited<ReturnType<typeof createUi>>> | null = null;

    const removeUi = () => {
      uiGeneration++;
      const pending = uiPromise;
      uiPromise = null;
      void pending?.then((ui) => ui?.remove());
    };

    const scan = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      if (disposed) return;
      if (lastPath !== location.pathname) {
        gallery.reset();
        collapse.dispose();
        removeUi();
        lastPath = location.pathname;
      }
      if (!enabled || !pullRequestKey(location.href)) {
        gallery.reset();
        collapse.dispose();
        removeUi();
        entries = [];
        return;
      }
      entries = discoverImages(document);
      gallery.update(entries.map((entry) => entry.image));
      collapse.update(entries, enabled && collapseImages);
    };
    const scheduleScan = () => {
      if (frame === null && !disposed) frame = requestAnimationFrame(scan);
    };

    const createUi = async () => {
      const generation = uiGeneration;
      const path = location.pathname;
      const ui = await createShadowRootUi(ctx, {
        name: 'pr-lens',
        position: 'overlay',
        zIndex: 2147483647,
        isolateEvents: true,
        onMount(container) {
          const app = document.createElement('div');
          const portal = document.createElement('div');
          container.append(app, portal);
          const root = createRoot(app);
          root.render(
            <Viewer
              gallery={gallery}
              theme={theme}
              portalContainer={portal}
              onRetry={scan}
              resolveReturnFocus={collapse.resolveReturnFocus}
            />,
          );
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });
      if (
        disposed ||
        !enabled ||
        generation !== uiGeneration ||
        path !== location.pathname ||
        !pullRequestKey(location.href)
      ) {
        ui.remove();
        return null;
      }
      ui.mount();
      return ui;
    };

    const onClick = (event: MouseEvent) => {
      if (!enabled || !pullRequestKey(location.href)) return;
      const element = collapse.clickedImage(event) ?? clickedImage(event);
      if (!element) return;
      scan();
      const entry = entries.find((item) => item.element === element);
      if (!entry) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const anchor = collapse.focusTarget(element) ?? element.closest('a');
      const returnFocus =
        anchor ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      gallery.show(entry.image.id, returnFocus, event.detail === 0 ? 'keyboard' : 'pointer');
      if (!uiPromise) {
        const generation = uiGeneration;
        uiPromise = createUi().catch((error: unknown) => {
          if (generation === uiGeneration) {
            uiPromise = null;
            gallery.close();
            console.error(
              'PR Lens could not open its viewer.',
              error instanceof Error ? error.name : 'Unknown error',
            );
          }
          return null;
        });
      }
    };

    const observer = new MutationObserver((records) => {
      if (
        lastPath !== location.pathname ||
        records.some((record) => !isCollapseMutation(record) && affectsImages(record))
      )
        scheduleScan();
    });
    observer.observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'src',
        'srcset',
        'data-src',
        'data-canonical-src',
        'href',
        'alt',
        'class',
        'id',
        'role',
      ],
    });
    ctx.addEventListener(document, 'click', onClick, { capture: true });
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl, oldUrl }) => {
      // Fragment jumps and their cleanup stay in the same rendered PR document.
      if (
        newUrl.origin === oldUrl.origin &&
        newUrl.pathname === oldUrl.pathname &&
        newUrl.search === oldUrl.search
      )
        return;
      gallery.reset();
      scheduleScan();
    });
    ctx.addEventListener(document, 'turbo:load', scheduleScan);
    ctx.addEventListener(
      document,
      'load',
      (event) => {
        if (event.target instanceof HTMLImageElement && event.target.closest('.markdown-body'))
          scheduleScan();
      },
      { capture: true },
    );
    ctx.addEventListener(window, 'resize', scheduleScan);
    const onSettingsChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (disposed || area !== 'local' || (!changes.enabled && !changes.collapseImages)) return;
      if (changes.enabled) {
        enabledChanged = true;
        enabled = changes.enabled.newValue !== false;
        if (!enabled) gallery.reset();
      }
      if (changes.collapseImages) {
        collapseChanged = true;
        collapseImages = changes.collapseImages.newValue === true;
      }
      scheduleScan();
    };
    browser.storage.onChanged.addListener(onSettingsChanged);
    void browser.storage.local.get(['enabled', 'collapseImages']).then(
      (settings) => {
        if (disposed) return;
        if (!enabledChanged) enabled = settings.enabled !== false;
        if (!collapseChanged) collapseImages = settings.collapseImages === true;
        scheduleScan();
      },
      () => {
        if (disposed || enabledChanged) return;
        enabled = true;
        scheduleScan();
      },
    );
    ctx.onInvalidated(() => {
      disposed = true;
      observer.disconnect();
      browser.storage.onChanged.removeListener(onSettingsChanged);
      theme.dispose();
      if (frame !== null) cancelAnimationFrame(frame);
      gallery.reset();
      collapse.dispose();
      entries = [];
      removeUi();
    });
  },
});
