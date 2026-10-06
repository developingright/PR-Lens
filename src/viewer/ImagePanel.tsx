import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, ImageOff, Minus, Plus, RotateCcw } from 'lucide-react';
import type { GalleryImage } from '../gallery/model';
import { IconButton } from './IconButton';
import { useImageGestures } from './useImageGestures';

interface ImagePanelProps {
  image: GalleryImage;
  onRetry: () => void;
  controlsContainer: HTMLElement | null;
}

export function ImagePanel({ image, onRetry, controlsContainer }: ImagePanelProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const gestureHelp = useId();
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [retry, setRetry] = useState(0);
  const gestures = useImageGestures(viewport, natural, bounds, status === 'loaded');
  const { scale, x, y, fit, canPan, dragging, changeZoom, reset } = gestures;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lens-image-panel">
      <div
        ref={viewport}
        className="lens-stage"
        data-pannable={canPan}
        data-dragging={dragging}
        role="region"
        aria-label="Screenshot preview"
        aria-describedby={gestureHelp}
        {...gestures.handlers}
      >
        {status === 'loading' && (
          <div className="lens-image-state" role="status">
            <span className="lens-loading-mark" />
            Loading screenshot…
          </div>
        )}
        {status === 'failed' && (
          <div className="lens-image-state lens-error-state" role="status">
            <ImageOff size={28} strokeWidth={1.4} />
            <strong>This image couldn’t load</strong>
            <span>The link may have expired, or the image may be unavailable.</span>
            <button
              className="lens-text-button"
              type="button"
              onClick={() => {
                onRetry();
                setStatus('loading');
                setRetry((value) => value + 1);
              }}
            >
              Try again <RotateCcw size={13} />
            </button>
          </div>
        )}
        <img
          key={retry}
          src={image.src}
          alt={image.title}
          draggable={false}
          className="lens-main-image"
          data-testid="stage-image"
          style={{
            width: natural.width || 'auto',
            height: natural.height || 'auto',
            opacity: status === 'loaded' ? 1 : 0,
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
          }}
          onLoad={(event) => {
            setNatural({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
            setStatus('loaded');
          }}
          onError={() => setStatus('failed')}
        />
      </div>
      <p id={gestureHelp} className="lens-sr-only">
        Pinch or Control/Command plus scroll to zoom. Drag or scroll to pan a zoomed image.
        Double-click to zoom or fit.
      </p>
      {controlsContainer &&
        createPortal(
          <div className="lens-zoom-bar" role="group" aria-label="Image controls">
            <IconButton
              label="Zoom out"
              disabled={status !== 'loaded' || scale <= fit + 0.001}
              onClick={() => changeZoom(-1)}
            >
              <Minus size={14} strokeWidth={1.6} />
            </IconButton>
            <span
              className="lens-zoom-value"
              title="Pinch or Ctrl/⌘ + scroll to zoom · Drag or scroll to pan · Double-click to zoom or fit"
            >
              {status === 'loaded' ? `${Math.round(scale * 100)}%` : '—'}
            </span>
            <IconButton
              label="Zoom in"
              disabled={status !== 'loaded' || scale >= 4}
              onClick={() => changeZoom(1)}
            >
              <Plus size={14} strokeWidth={1.6} />
            </IconButton>
            <span className="lens-control-divider" aria-hidden="true" />
            <IconButton label="Fit image to view" disabled={status !== 'loaded'} onClick={reset}>
              <Expand size={14} strokeWidth={1.6} />
            </IconButton>
          </div>,
          controlsContainer,
        )}
    </div>
  );
}
