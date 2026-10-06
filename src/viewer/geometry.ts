export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ImageTransform extends Point {
  scale: number;
}

export function fitScale(image: Size, viewport: Size): number {
  if (!image.width || !image.height || !viewport.width || !viewport.height) return 1;
  return Math.max(
    0.01,
    Math.min(1, (viewport.width - 48) / image.width, (viewport.height - 40) / image.height),
  );
}

export function clampPan(value: number, imageSize: number, viewportSize: number): number {
  const limit = Math.max(0, (imageSize - viewportSize) / 2);
  return limit === 0 ? 0 : Math.max(-limit, Math.min(limit, value));
}

export function boundTransform(
  transform: ImageTransform,
  image: Size,
  viewport: Size,
  fit: number,
): ImageTransform {
  const scale = Math.max(fit, Math.min(4, transform.scale));
  return {
    scale,
    x: clampPan(transform.x, image.width * scale, viewport.width - 24),
    y: clampPan(transform.y, image.height * scale, viewport.height - 24),
  };
}

/** Keep the image point under the pointer stationary, except where an edge constrains it. */
export function zoomAt(
  current: ImageTransform,
  requestedScale: number,
  anchor: Point,
  image: Size,
  viewport: Size,
  fit: number,
): ImageTransform {
  const scale = Math.max(fit, Math.min(4, requestedScale));
  const ratio = scale / current.scale;
  return boundTransform(
    {
      scale,
      x: anchor.x - (anchor.x - current.x) * ratio,
      y: anchor.y - (anchor.y - current.y) * ratio,
    },
    image,
    viewport,
    fit,
  );
}
