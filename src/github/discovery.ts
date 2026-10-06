import { httpsUrl, type GalleryImage } from '../gallery/model';

const BODY_SELECTOR = '.markdown-body';
const COMMENT_SELECTOR =
  '.timeline-comment, .review-comment, [id^="discussion_r"], [data-testid="comment"]';
const EXCLUDED_SELECTOR =
  'form, .js-preview-body, .comment-form, [data-testid="markdown-preview"], .emoji, .avatar, pr-lens';
const BADGE_HOSTS = ['img.shields.io', 'badgen.net', 'badge.fury.io'];
const ids = new WeakMap<HTMLImageElement, string>();
let nextId = 0;

export interface DiscoveredImage {
  image: GalleryImage;
  element: HTMLImageElement;
}

export function pullRequestKey(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname !== 'github.com') return null;
    return (
      pathname
        .match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/.*)?$/)
        ?.slice(1, 4)
        .join('/') ?? null
    );
  } catch {
    return null;
  }
}

function isBadge(element: HTMLImageElement, src: string) {
  const url = new URL(src);
  const width = Number(element.getAttribute('width')) || element.naturalWidth;
  const height = Number(element.getAttribute('height')) || element.naturalHeight;
  return (
    BADGE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
    /\/badge\.svg$/.test(url.pathname) ||
    (width > 0 && height > 0 && width <= 24 && height <= 24)
  );
}

function originalImageUrl(element: HTMLImageElement, src: string, base: string): string {
  const href = httpsUrl(element.closest('a')?.getAttribute('href') ?? null, base);
  if (!href) return src;
  const url = new URL(href);
  const isImage =
    href === src ||
    /\.(?:png|jpe?g|gif|webp|avif|svg)(?:$|\/)/i.test(url.pathname) ||
    /\/(?:user-attachments\/assets|assets|files)\//.test(url.pathname) ||
    url.hostname.endsWith('githubusercontent.com');
  return isImage ? href : src;
}

export function discoverImages(doc: Document, root: ParentNode = doc): DiscoveredImage[] {
  const images = [...root.querySelectorAll<HTMLImageElement>(`${BODY_SELECTOR} img`)];
  return images.flatMap((element): DiscoveredImage[] => {
    if (element.closest(EXCLUDED_SELECTOR)) return [];
    const src = httpsUrl(
      element.currentSrc || element.getAttribute('src') || element.getAttribute('data-src'),
      doc.location.href,
    );
    if (!src || isBadge(element, src)) return [];

    let id = ids.get(element);
    if (!id) {
      id = `pr-image-${++nextId}`;
      ids.set(element, id);
    }
    const comment = element.closest(COMMENT_SELECTOR);
    const author = comment
      ?.querySelector('.author, [data-hovercard-type="user"]')
      ?.textContent?.trim();
    const sourceId = element.closest(
      '[id^="issuecomment-"], [id^="discussion_r"], [id^="pullrequestreview-"], [id^="issue-"]',
    )?.id;
    // A quoted link inside the comment body is not the comment's own permalink.
    const sourceAnchor = [...(comment?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])].find(
      (anchor) => {
        if (anchor.closest(BODY_SELECTOR)) return false;
        const href = httpsUrl(anchor.getAttribute('href'), doc.location.href);
        if (!href) return false;
        const url = new URL(href);
        return (
          pullRequestKey(url.href) === pullRequestKey(doc.location.href) &&
          /^#(?:issuecomment-|discussion_r|pullrequestreview-|issue-)/.test(url.hash) &&
          (!sourceId || url.hash === `#${sourceId}`)
        );
      },
    );
    const fallbackSource = sourceId
      ? `${doc.location.origin}${doc.location.pathname}#${sourceId}`
      : null;
    const sourceUrl = httpsUrl(
      sourceAnchor?.getAttribute('href') ?? fallbackSource,
      doc.location.href,
    );
    const alt = element.getAttribute('alt')?.trim();
    const title = alt && !/^(?:image|screenshot)$/i.test(alt) ? alt : 'Screenshot';
    return [
      {
        element,
        image: {
          id,
          src,
          originalUrl: originalImageUrl(element, src, doc.location.href),
          title,
          context: sourceId?.startsWith('issue-')
            ? 'PR description'
            : author
              ? `Comment by ${author}`
              : comment
                ? 'Review comment'
                : 'PR description',
          sourceUrl,
        },
      },
    ];
  });
}

export function clickedImage(event: MouseEvent): HTMLImageElement | null {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.defaultPrevented
  )
    return null;
  const target = event.target;
  if (!(target instanceof Element)) return null;
  if (target instanceof HTMLImageElement) return target;
  const anchor = target.closest('a');
  if (anchor && anchor.querySelectorAll('img').length === 1 && !anchor.textContent?.trim())
    return anchor.querySelector('img');
  return null;
}

export function affectsImages(record: MutationRecord): boolean {
  const target = record.target instanceof Element ? record.target : record.target.parentElement;
  if (target?.closest('pr-lens')) return false;
  if (target?.closest(BODY_SELECTOR)) return true;
  return [...record.addedNodes, ...record.removedNodes].some(
    (node) =>
      node instanceof Element &&
      (node.matches(`${BODY_SELECTOR}, main`) || !!node.querySelector(BODY_SELECTOR)),
  );
}
