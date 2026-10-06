import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Expand, ExternalLink, ImageOff, Minus, Plus, RotateCcw } from 'lucide-react';
import type { GalleryImage } from '../gallery/model';
import { IconButton } from './IconButton';

export function clampPan(value: number, imageSize: number, viewportSize: number): number {
  const limit = Math.max(0, (imageSize - viewportSize) / 2);
  return Math.max(-limit, Math.min(limit, value));
}

interface ImagePanelProps {
  image: GalleryImage;
  onRetry: () => void;
}

export function ImagePanel({ image, onRetry }: ImagePanelProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [requestedScale, setRequestedScale] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [retry, setRetry] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit =
    natural.width && bounds.width
      ? Math.min(1, (bounds.width - 48) / natural.width, (bounds.height - 48) / natural.height)
      : 1;
  const scale = requestedScale ?? Math.max(0.01, fit);
  const canPan = scale > fit && status === 'loaded';
  const x = clampPan(offset.x, natural.width * scale, bounds.width - 24);
  const y = clampPan(offset.y, natural.height * scale, bounds.height - 24);
  const changeZoom = (direction: -1 | 1) => {
    setRequestedScale(
      Math.max(Math.max(0.01, fit), Math.min(4, scale * (direction === 1 ? 1.4 : 1 / 1.4))),
    );
    setOffset({ x: 0, y: 0 });
  };
  const reset = () => {
    setRequestedScale(null);
    setOffset({ x: 0, y: 0 });
  };

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPan || event.button !== 0 || pointer.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: x,
      startY: y,
    };
    setDragging(true);
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const active = pointer.current;
    if (!active || event.pointerId !== active.id) return;
    setOffset({
      x: clampPan(
        active.startX + event.clientX - active.x,
        natural.width * scale,
        bounds.width - 24,
      ),
      y: clampPan(
        active.startY + event.clientY - active.y,
        natural.height * scale,
        bounds.height - 24,
      ),
    });
  };
  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="lens-image-panel">
      <div
        ref={viewport}
        className="lens-stage"
        data-pannable={canPan}
        data-dragging={dragging}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onLostPointerCapture={endPan}
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
      <div className="lens-zoom-bar" role="group" aria-label="Image controls">
        <IconButton
          label="Zoom out"
          disabled={status !== 'loaded' || scale <= fit + 0.001}
          onClick={() => changeZoom(-1)}
        >
          <Minus size={17} />
        </IconButton>
        <span className="lens-zoom-value" aria-live="polite">
          {status === 'loaded' ? `${Math.round(scale * 100)}%` : '—'}
        </span>
        <IconButton
          label="Zoom in"
          disabled={status !== 'loaded' || scale >= 4}
          onClick={() => changeZoom(1)}
        >
          <Plus size={17} />
        </IconButton>
        <span className="lens-control-divider" />
        <IconButton label="Fit image to view" disabled={status !== 'loaded'} onClick={reset}>
          <Expand size={16} />
        </IconButton>
        <a
          className="lens-icon-button"
          aria-label="Open image in new tab"
          title="Open image in new tab"
          href={image.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
