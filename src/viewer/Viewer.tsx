import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import {
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Images,
  Monitor,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import type { GalleryStore } from '../gallery/model';
import type { ThemeStore } from '../theme/store';
import { IconButton } from './IconButton';
import { ImagePanel } from './ImagePanel';

interface ViewerProps {
  gallery: GalleryStore;
  theme: ThemeStore;
  portalContainer: HTMLElement;
  onRetry: () => void;
}

export function Viewer({ gallery, theme, portalContainer, onRetry }: ViewerProps) {
  const snapshot = useSyncExternalStore(gallery.subscribe, gallery.getSnapshot);
  const appearance = useSyncExternalStore(theme.subscribe, theme.getSnapshot);
  const strip = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const index = snapshot.items.findIndex((item) => item.id === snapshot.activeId);
  const image = snapshot.items[index];

  useEffect(() => {
    if (!snapshot.open) return;
    strip.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
    const neighbors = [snapshot.items[index - 1], snapshot.items[index + 1]];
    const preloaded = neighbors.flatMap((item) => {
      if (!item) return [];
      const preload = new Image();
      preload.src = item.src;
      return [preload];
    });
    return () => {
      preloaded.forEach((item) => {
        item.removeAttribute('src');
      });
    };
  }, [index, snapshot.items, snapshot.open]);

  const navigate = (next: number) => {
    const nextImage = snapshot.items[next];
    if (nextImage) gallery.select(nextImage.id);
  };
  const handleKey = (event: KeyboardEvent) => {
    gallery.setInputMode('keyboard');
    // Do not turn horizontal arrows inside the appearance group into gallery navigation.
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target instanceof Element && event.target.closest('[data-theme-controls]'))
    )
      return;
    const targets: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: snapshot.items.length - 1,
    };
    const target = targets[event.key];
    if (target !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      navigate(target);
    }
  };

  return (
    <div className="lens-root" data-theme={appearance.resolved} data-input={snapshot.inputMode}>
      <Dialog.Root
        open={snapshot.open && !!image}
        onOpenChange={(open, details) => {
          if (!open) {
            if (details.event.type.startsWith('key')) gallery.setInputMode('keyboard');
            gallery.close();
          }
        }}
      >
        <Dialog.Portal container={portalContainer}>
          <div
            className="lens-root lens-layer"
            data-theme={appearance.resolved}
            data-input={snapshot.inputMode}
            onKeyDownCapture={handleKey}
            onPointerDownCapture={() => gallery.setInputMode('pointer')}
          >
            <Dialog.Backdrop className="lens-backdrop" />
            <Dialog.Popup
              className="lens-dialog"
              initialFocus={closeButton}
              finalFocus={() => (snapshot.returnFocus?.isConnected ? snapshot.returnFocus : false)}
            >
              <header className="lens-header">
                <div className="lens-brand">
                  <span className="lens-brand-icon">
                    <Images size={17} strokeWidth={1.6} />
                  </span>
                  <span>
                    PR <b>Lens</b>
                  </span>
                </div>
                <div className="lens-title-block">
                  <Dialog.Title className="lens-title">{image?.title ?? 'PR images'}</Dialog.Title>
                  <Dialog.Description className="lens-context">
                    {image?.context ?? 'Screenshots from this pull request'}
                  </Dialog.Description>
                </div>
                <div className="lens-header-actions">
                  <div
                    className="lens-appearance"
                    role="group"
                    aria-label="Appearance"
                    data-theme-controls
                  >
                    {(
                      [
                        { value: 'auto', label: 'Auto theme', Icon: Monitor },
                        { value: 'light', label: 'Light theme', Icon: Sun },
                        { value: 'dark', label: 'Dark theme', Icon: Moon },
                      ] as const
                    ).map(({ value, label, Icon }) => (
                      <IconButton
                        key={value}
                        label={label}
                        aria-pressed={appearance.preference === value}
                        onClick={() => theme.setPreference(value)}
                      >
                        <Icon size={15} strokeWidth={1.7} />
                      </IconButton>
                    ))}
                  </div>
                  <span className="lens-header-divider" />
                  <IconButton ref={closeButton} label="Close viewer" onClick={gallery.close}>
                    <X size={19} strokeWidth={1.6} />
                  </IconButton>
                </div>
              </header>
              <div className="lens-stage-shell">
                {image && (
                  <ImagePanel key={`${image.id}:${image.src}`} image={image} onRetry={onRetry} />
                )}
                <IconButton
                  label="Previous image"
                  className="lens-nav lens-nav-previous"
                  disabled={index <= 0}
                  onClick={() => navigate(index - 1)}
                >
                  <ChevronLeft size={23} strokeWidth={1.5} />
                </IconButton>
                <IconButton
                  label="Next image"
                  className="lens-nav lens-nav-next"
                  disabled={index >= snapshot.items.length - 1}
                  onClick={() => navigate(index + 1)}
                >
                  <ChevronRight size={23} strokeWidth={1.5} />
                </IconButton>
              </div>
              <footer className="lens-footer">
                <div className="lens-filmstrip-heading">
                  <span className="lens-count" aria-live="polite" aria-atomic="true">
                    <b>{index + 1}</b>
                    <span>/</span>
                    {snapshot.items.length}{' '}
                    <span className="lens-count-label">
                      {snapshot.items.length === 1 ? 'image' : 'images'} in this PR
                    </span>
                  </span>
                  {image?.sourceUrl && (
                    <a className="lens-source-link" href={image.sourceUrl} onClick={gallery.close}>
                      View comment <ArrowDownLeft size={13} />
                    </a>
                  )}
                </div>
                <div
                  ref={strip}
                  className="lens-filmstrip"
                  role="group"
                  aria-label="PR image thumbnails"
                >
                  {snapshot.items.map((item, itemIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      className="lens-thumbnail"
                      aria-pressed={item.id === snapshot.activeId}
                      aria-label={`View image ${itemIndex + 1}: ${item.title}`}
                      title={`${item.title} · ${item.context}`}
                      onClick={() => gallery.select(item.id)}
                    >
                      <img
                        src={item.src}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        onError={(event) => {
                          event.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                      <span className="lens-thumbnail-number">{itemIndex + 1}</span>
                    </button>
                  ))}
                </div>
                <div className="lens-footer-hint">
                  <span>Made for a closer look.</span>
                  <span>
                    <kbd>←</kbd>
                    <kbd>→</kbd> to browse <span className="lens-hint-dot">·</span> <kbd>esc</kbd>{' '}
                    to close
                  </span>
                </div>
              </footer>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
