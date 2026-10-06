import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import {
  CornerUpLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Monitor,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import type { GalleryStore } from '../gallery/model';
import type { ThemeStore } from '../theme/store';
import { IconButton } from './IconButton';
import { ImagePanel } from './ImagePanel';
import { useSourceNavigation } from './useSourceNavigation';

interface ViewerProps {
  gallery: GalleryStore;
  theme: ThemeStore;
  portalContainer: HTMLElement;
  onRetry: () => void;
  resolveReturnFocus?: (target: HTMLElement | null) => HTMLElement | null;
}

export function Viewer({
  gallery,
  theme,
  portalContainer,
  onRetry,
  resolveReturnFocus,
}: ViewerProps) {
  const snapshot = useSyncExternalStore(gallery.subscribe, gallery.getSnapshot);
  const appearance = useSyncExternalStore(theme.subscribe, theme.getSnapshot);
  const sourceNavigation = useSourceNavigation(gallery);
  const strip = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [controlsContainer, setControlsContainer] = useState<HTMLDivElement | null>(null);
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
        onOpenChangeComplete={sourceNavigation.onOpenChangeComplete}
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
              finalFocus={() => {
                if (sourceNavigation.isPending()) return false;
                // Teardown can precede React's next render after navigation.
                const returnFocus = gallery.getSnapshot().returnFocus;
                const target = resolveReturnFocus ? resolveReturnFocus(returnFocus) : returnFocus;
                return target?.isConnected ? target : false;
              }}
            >
              <header className="lens-header">
                <span className="lens-count" aria-live="polite" aria-atomic="true">
                  <b>{index + 1}</b>
                  <span>/</span>
                  {snapshot.items.length}
                </span>
                <span className="lens-header-divider" />
                <div className="lens-title-block">
                  <Dialog.Title className="lens-title" title={image?.title}>
                    {image?.title ?? 'PR images'}
                  </Dialog.Title>
                  <Dialog.Description className="lens-sr-only">
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
                        <Icon size={14} strokeWidth={1.6} />
                      </IconButton>
                    ))}
                  </div>
                  <IconButton ref={closeButton} label="Close viewer" onClick={gallery.close}>
                    <X size={17} strokeWidth={1.6} />
                  </IconButton>
                </div>
              </header>
              <div className="lens-stage-shell">
                {image && (
                  <ImagePanel
                    key={`${image.id}:${image.src}`}
                    image={image}
                    onRetry={onRetry}
                    controlsContainer={controlsContainer}
                  />
                )}
                <div className="lens-preview-tools">
                  <div
                    className="lens-preview-navigation"
                    role="group"
                    aria-label="Image navigation"
                  >
                    <IconButton
                      label="Previous image"
                      className="lens-nav"
                      disabled={index <= 0}
                      onClick={() => navigate(index - 1)}
                    >
                      <ChevronLeft size={20} strokeWidth={1.5} />
                    </IconButton>
                    <IconButton
                      label="Next image"
                      className="lens-nav"
                      disabled={index >= snapshot.items.length - 1}
                      onClick={() => navigate(index + 1)}
                    >
                      <ChevronRight size={20} strokeWidth={1.5} />
                    </IconButton>
                  </div>
                  <span className="lens-control-divider" aria-hidden="true" />
                  <div ref={setControlsContainer} className="lens-image-controls-slot" />
                </div>
              </div>
              <footer className="lens-footer">
                <div className="lens-footer-context">
                  {image?.sourceUrl ? (
                    <a
                      className="lens-source-link"
                      href={image.sourceUrl}
                      title={
                        image.context === 'PR description' ? 'Go to description' : 'Go to comment'
                      }
                      aria-label={
                        image.context === 'PR description' ? 'Go to description' : 'Go to comment'
                      }
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                          return;
                        if (!image.sourceUrl) return;
                        event.preventDefault();
                        sourceNavigation.start(image.sourceUrl);
                      }}
                    >
                      <CornerUpLeft size={14} strokeWidth={1.6} />
                      <span className="lens-context">{image.context}</span>
                    </a>
                  ) : (
                    <span className="lens-context" title={image?.context}>
                      {image?.context}
                    </span>
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
                      title={`${itemIndex + 1} of ${snapshot.items.length} — ${item.title} · ${item.context}`}
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
                    </button>
                  ))}
                </div>
                <div className="lens-footer-actions">
                  {image && (
                    <a
                      className="lens-icon-button"
                      aria-label="Open image in new tab"
                      title="Open image in new tab"
                      href={image.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} strokeWidth={1.6} />
                    </a>
                  )}
                </div>
              </footer>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
