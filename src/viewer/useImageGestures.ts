import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
  type MouseEvent,
} from 'react';
import {
  boundTransform,
  fitScale,
  zoomAt,
  type ImageTransform,
  type Point,
  type Size,
} from './geometry';

interface View extends Point {
  scale: number | null;
}
const fitted: View = { scale: null, x: 0, y: 0 };
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function useImageGestures(
  viewport: RefObject<HTMLDivElement | null>,
  image: Size,
  bounds: Size,
  enabled: boolean,
) {
  const [view, setView] = useState<View>(fitted);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    view: ImageTransform;
    last: ImageTransform;
    points: Point[];
  } | null>(null);
  const fit = fitScale(image, bounds);
  const resolve = (current: View) =>
    boundTransform({ ...current, scale: current.scale ?? fit }, image, bounds, fit);
  const transform = resolve(view);
  const canPan = enabled && transform.scale > fit + 0.001;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!enabled) return;
      // React's delegated wheel listeners can be passive; cancel native page zoom locally.
      event.preventDefault();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1;
      const deltaX = event.deltaX * units;
      const deltaY = event.deltaY * units;
      const rect = element.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.x - rect.width / 2,
        y: event.clientY - rect.y - rect.height / 2,
      };
      setView((current) => {
        const resolved = boundTransform(
          { ...current, scale: current.scale ?? fit },
          image,
          bounds,
          fit,
        );
        if (event.ctrlKey || event.metaKey) {
          const factor = Math.exp(-Math.max(-200, Math.min(200, deltaY)) * 0.005);
          return zoomAt(resolved, resolved.scale * factor, anchor, image, bounds, fit);
        }
        if (resolved.scale <= fit + 0.001) return current;
        return boundTransform(
          {
            ...resolved,
            x: resolved.x - (event.shiftKey && !deltaX ? deltaY : deltaX),
            y: resolved.y - (event.shiftKey && !deltaX ? 0 : deltaY),
          },
          image,
          bounds,
          fit,
        );
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [viewport, image, bounds, fit, enabled]);

  const reset = () => {
    const active = [...pointers.current.keys()];
    pointers.current.clear();
    gesture.current = null;
    for (const id of active) {
      if (viewport.current?.hasPointerCapture(id)) viewport.current.releasePointerCapture(id);
    }
    setDragging(false);
    setView(fitted);
  };
  const changeZoom = (direction: -1 | 1) => {
    setView((current) => {
      const resolved = resolve(current);
      return zoomAt(
        resolved,
        resolved.scale * (direction === 1 ? 1.4 : 1 / 1.4),
        { x: 0, y: 0 },
        image,
        bounds,
        fit,
      );
    });
  };
  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0 || pointers.current.size >= 2) return;
    if (event.pointerType !== 'touch' && !canPan) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const live = gesture.current?.last ?? transform;
    gesture.current = { view: live, last: live, points: [...pointers.current.values()] };
    setDragging(canPan || pointers.current.size > 1);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    const initial = gesture.current;
    const start = initial.points[0];
    const end = points[0];
    if (!start || !end) return;
    if (initial.points[1] && points[1]) {
      const before = midpoint(start, initial.points[1]);
      const after = midpoint(end, points[1]);
      const rect = event.currentTarget.getBoundingClientRect();
      const next = zoomAt(
        initial.view,
        (initial.view.scale * distance(end, points[1])) /
          Math.max(1, distance(start, initial.points[1])),
        { x: before.x - rect.x - rect.width / 2, y: before.y - rect.y - rect.height / 2 },
        image,
        bounds,
        fit,
      );
      const result = boundTransform(
        { ...next, x: next.x + after.x - before.x, y: next.y + after.y - before.y },
        image,
        bounds,
        fit,
      );
      initial.last = result;
      setView(result);
    } else {
      const result = boundTransform(
        {
          ...initial.view,
          x: initial.view.x + end.x - start.x,
          y: initial.view.y + end.y - start.y,
        },
        image,
        bounds,
        fit,
      );
      initial.last = result;
      setView(result);
    }
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    // Rebase after lifting one finger so the remaining finger continues without a jump.
    // Use the latest input transform even if React has not painted that move yet.
    const live = gesture.current?.last ?? transform;
    gesture.current = pointers.current.size
      ? { view: live, last: live, points: [...pointers.current.values()] }
      : null;
    setDragging(pointers.current.size > 0 && live.scale > fit + 0.001);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const doubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!enabled) return;
    if (canPan) return reset();
    const rect = event.currentTarget.getBoundingClientRect();
    setView(
      zoomAt(
        transform,
        Math.max(1, fit * 2),
        { x: event.clientX - rect.x - rect.width / 2, y: event.clientY - rect.y - rect.height / 2 },
        image,
        bounds,
        fit,
      ),
    );
  };

  return {
    ...transform,
    fit,
    canPan,
    dragging,
    changeZoom,
    reset,
    handlers: {
      onPointerDown: start,
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      onDoubleClick: doubleClick,
    },
  };
}
