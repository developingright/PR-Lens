import type { GalleryImage } from '../src/gallery/model';

export type Dataset = 'demo' | 'worst' | 'one' | 'empty' | 'many';
const make = (
  id: string,
  file: string,
  title: string,
  context = 'PR description',
  sourceUrl = '#description',
): GalleryImage => ({
  id,
  src: `/images/${file}`,
  originalUrl: `/images/${file}`,
  title,
  context,
  sourceUrl,
});
export const demoImages: GalleryImage[] = [
  make('overview', 'overview.svg', 'Workspace overview · light mode'),
  make('dark', 'dark.svg', 'Workspace overview · dark mode', 'Comment by maya', '#maya-comment'),
  make('settings', 'settings.svg', 'Notification preferences', 'Comment by alex', '#review'),
  make(
    'detail',
    'detail.svg',
    'Project activity and release details',
    'Comment by alex',
    '#review',
  ),
];
export function fixtureImages(dataset: Dataset): GalleryImage[] {
  if (dataset === 'empty') return [];
  if (dataset === 'one') return [demoImages[0]!];
  if (dataset === 'many')
    return Array.from({ length: 1000 }, (_, i) => ({
      ...demoImages[i % demoImages.length]!,
      id: `many-${i}`,
      title: `Screenshot ${i + 1}`,
    }));
  if (dataset === 'worst')
    return [
      make(
        'long',
        'overview.svg',
        'Workspace overview — notification-preferences-and-accessibility-review — FINAL (revised) v12 [approved for release]',
        'Comment by Aleksandra Wiśniewska-Kowalczyk',
      ),
      make('tall', 'tall.svg', 'Mobile checkout, complete flow · 200 × 4000'),
      make('wide', 'wide.svg', 'Release timeline panorama · 4000 × 200'),
      make('broken', 'missing.svg', 'Unavailable attachment'),
      make('transparent', 'transparent.svg', 'Transparent design asset'),
      make(
        'non-latin',
        'settings.svg',
        '通知設定 — Đặng Thị Ngọc Hân — مراجعة التصميم',
        'Comment by 王秀英',
      ),
    ];
  return demoImages;
}
