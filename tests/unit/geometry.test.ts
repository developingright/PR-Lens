import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { boundTransform, fitScale, zoomAt } from '../../src/viewer/geometry';

const image = { width: 1200, height: 800 };
const viewport = { width: 600, height: 400 };
const fit = fitScale(image, viewport);

test('zoom holds the image coordinate beneath an off-center pointer', () => {
  const current = { scale: 1, x: 40, y: -20 };
  const anchor = { x: 80, y: 60 };
  const next = zoomAt(current, 2, anchor, image, viewport, fit);
  assert.equal((anchor.x - current.x) / current.scale, (anchor.x - next.x) / next.scale);
  assert.equal((anchor.y - current.y) / current.scale, (anchor.y - next.y) / next.scale);
});

test('gesture zoom cannot exceed 400% or shrink below fit', () => {
  const current = { scale: 1, x: 30, y: 40 };
  assert.equal(zoomAt(current, 1000, { x: 0, y: 0 }, image, viewport, fit).scale, 4);
  assert.deepEqual(zoomAt(current, 0, { x: 0, y: 0 }, image, viewport, fit), {
    scale: fit,
    x: 0,
    y: 0,
  });
});

test('extreme panning and viewport resizing keep the image bounded', () => {
  const current = { scale: 1, x: 10000, y: -10000 };
  const next = boundTransform(current, image, viewport, fit);
  assert.equal(next.x, (image.width - viewport.width + 24) / 2);
  assert.equal(next.y, -(image.height - viewport.height + 24) / 2);
  const larger = { width: 1600, height: 1000 };
  assert.deepEqual(boundTransform(next, image, larger, fitScale(image, larger)), {
    scale: 1,
    x: 0,
    y: 0,
  });
});

test('portrait and panoramic images fit without distortion or upscaling', () => {
  assert.equal(fitScale({ width: 200, height: 4000 }, viewport), 0.09);
  assert.equal(fitScale({ width: 4000, height: 200 }, viewport), 0.138);
  assert.equal(fitScale({ width: 10, height: 10 }, viewport), 1);
});
