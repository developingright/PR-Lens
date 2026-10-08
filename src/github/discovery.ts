import { httpsUrl, type GalleryImage } from '../gallery/model';

const BODY_SELECTOR = '.markdown-body';
const COMMENT_SELECTOR =
  '.timeline-comment, .review-comment, [id^="discussion_r"], [data-testid="comment"]';
// Native anchors are checked separately: GitHub wraps ordinary markdown images in
// links to the image itself. Other links and controls must retain their actions.
const INTERACTIVE_SELECTOR = 'button, [role~="link"]:not(a), [role~="button"]';
const EXCLUDED_SELECTOR = `form, .js-preview-body, .comment-form, [data-testid="markdown-preview"], .emoji, .avatar, pr-lens, ${INTERACTIVE_SELECTOR}`;
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

function imageSources(element: HTMLImageElement): { src: string; originalUrl: string } | null {
  if (element.closest(EXCLUDED_SELECTOR)) return null;
  const base = element.ownerDocument.location.href;
  const src = httpsUrl(
    element.currentSrc || element.getAttribute('src') || element.getAttribute('data-src'),
    base,
  );
  if (!src || isBadge(element, src)) return null;
  const anchor = element.closest('a');
  if (!anchor) return { src, originalUrl: src };

  // Only an image-only link to this image qualifies, at any wrapper depth.
  // Do not guess from file extensions or hosts: a bot action may use either.
  if (
    !anchor.closest(BODY_SELECTOR) ||
    anchor.parentElement?.closest('a') ||
    anchor.querySelectorAll('img').length !== 1 ||
    anchor.textContent?.trim()
  )
    return null;
  const href = httpsUrl(anchor.getAttribute('href'), base);
  const sources = [
    src,
    httpsUrl(element.getAttribute('src'), base),
    httpsUrl(element.getAttribute('data-src'), base),
    httpsUrl(element.getAttribute('data-canonical-src'), base),
  ];
  return href && sources.includes(href) ? { src, originalUrl: href } : null;
}

export function discoverImages(doc: Document, root: ParentNode = doc): DiscoveredImage[] {
  const images = [...root.querySelectorAll<HTMLImageElement>(`${BODY_SELECTOR} img`)];
  return images.flatMap((element): DiscoveredImage[] => {
    const sources = imageSources(element);
    if (!sources) return [];

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
          ...sources,
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

export function isOrdinaryClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}

export function clickedImage(event: MouseEvent): HTMLImageElement | null {
  if (!isOrdinaryClick(event)) return null;
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const element =
    target instanceof HTMLImageElement ? target : target.closest('a')?.querySelector('img');
  return element && imageSources(element) ? element : null;
}

export function affectsImages(record: MutationRecord): boolean {
  const target = record.target instanceof Element ? record.target : record.target.parentElement;
  if (target?.closest('pr-lens')) return false;
  if (target?.closest(BODY_SELECTOR)) return true;
  // A wrapper above the markdown body may become (or stop being) an ARIA control.
  if (record.type === 'attributes' && record.attributeName === 'role')
    return !!target?.querySelector(BODY_SELECTOR);
  return [...record.addedNodes, ...record.removedNodes].some(
    (node) =>
      node instanceof Element &&
      (node.matches(`${BODY_SELECTOR}, main`) || !!node.querySelector(BODY_SELECTOR)),
  );
}
