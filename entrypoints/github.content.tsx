import { createRoot } from 'react-dom/client';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { browser } from 'wxt/browser';
import { GalleryStore } from '../src/gallery/model';
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
    const theme = createThemeStore(document, {
      load: async () => (await browser.storage.local.get('theme')).theme,
      save: async (value) => {
        await browser.storage.local.set({ theme: value });
      },
    });
    let entries: DiscoveredImage[] = [];
    let lastPath = location.pathname;
    let frame: number | null = null;
    let disposed = false;

    const scan = () => {
      frame = null;
      if (disposed) return;
      if (lastPath !== location.pathname) {
        gallery.reset();
        lastPath = location.pathname;
      }
      entries = pullRequestKey(location.href) ? discoverImages(document) : [];
      gallery.update(entries.map((entry) => entry.image));
    };
    const scheduleScan = () => {
      if (frame === null && !disposed) frame = requestAnimationFrame(scan);
    };

    const createUi = async () => {
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
            <Viewer gallery={gallery} theme={theme} portalContainer={portal} onRetry={scan} />,
          );
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });
      if (!disposed) ui.mount();
      return ui;
    };
    let uiPromise: Promise<Awaited<ReturnType<typeof createUi>> | null> | null = null;

    const onClick = (event: MouseEvent) => {
      if (!pullRequestKey(location.href)) return;
      const element = clickedImage(event);
      if (!element) return;
      scan();
      const entry = entries.find((item) => item.element === element);
      if (!entry) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const anchor = element.closest('a');
      const returnFocus =
        anchor ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      gallery.show(entry.image.id, returnFocus, event.detail === 0 ? 'keyboard' : 'pointer');
      uiPromise ??= createUi().catch((error: unknown) => {
        uiPromise = null;
        gallery.close();
        console.error(
          'PR Lens could not open its viewer.',
          error instanceof Error ? error.name : 'Unknown error',
        );
        return null;
      });
    };

    const observer = new MutationObserver((records) => {
      if (lastPath !== location.pathname || records.some(affectsImages)) scheduleScan();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'alt'],
    });
    ctx.addEventListener(document, 'click', onClick, { capture: true });
    ctx.addEventListener(window, 'wxt:locationchange', () => {
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
    scan();
    ctx.onInvalidated(() => {
      disposed = true;
      observer.disconnect();
      theme.dispose();
      if (frame !== null) cancelAnimationFrame(frame);
      gallery.reset();
      entries = [];
      void uiPromise?.then((ui) => ui?.remove());
    });
  },
});
