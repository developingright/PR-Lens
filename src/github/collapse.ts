import { isOrdinaryClick, type DiscoveredImage } from './discovery';

const COLLAPSED = 'data-pr-lens-collapsed';
const PLACEHOLDER = 'data-pr-lens-placeholder';
const ownedNodes = new WeakSet<Node>();

function isOwned(node: Node): boolean {
  for (let current: Node | null = node; current; current = current.parentNode) {
    if (ownedNodes.has(current)) return true;
  }
  return false;
}

/** Ignore our links and stylesheet, including their removal from a markdown body. */
export function isCollapseMutation(record: MutationRecord): boolean {
  if (isOwned(record.target)) return true;
  const nodes = [...record.addedNodes, ...record.removedNodes];
  return record.type === 'childList' && nodes.length > 0 && nodes.every(isOwned);
}

interface CollapsedImage {
  target: HTMLElement;
  link: HTMLAnchorElement;
}

function imageTarget(element: HTMLImageElement): HTMLElement {
  const picture = element.closest('picture') ?? element;
  const anchor = element.closest('a');
  return anchor && anchor.querySelectorAll('img').length === 1 && !anchor.textContent?.trim()
    ? anchor
    : picture;
}

/** Keep GitHub's original nodes connected so discovery, signed sources, and editors survive. */
export function createImageCollapse(doc: Document) {
  const records = new Map<HTMLImageElement, CollapsedImage>();
  const imagesByLink = new WeakMap<HTMLAnchorElement, HTMLImageElement>();
  const style = doc.createElement('style');
  ownedNodes.add(style);
  style.textContent = `
    [${COLLAPSED}] { display: none !important; }
    a[${PLACEHOLDER}] {
      display: inline-flex;
      max-inline-size: 100%;
      box-sizing: border-box;
      vertical-align: middle;
      padding-block: 2px;
      padding-inline-end: 0.75em;
      font-size: 0.875em;
      line-height: 1.5;
    }
    a[${PLACEHOLDER}] span:first-child {
      flex-shrink: 0;
      white-space: nowrap;
    }
    a[${PLACEHOLDER}] span:last-child {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    a[${PLACEHOLDER}]:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 3px;
      border-radius: 2px;
    }
  `;

  const restore = (element: HTMLImageElement, record: CollapsedImage) => {
    record.target.removeAttribute(COLLAPSED);
    if (doc.activeElement === record.link && element.isConnected) {
      const destination = element.closest('a') ?? element;
      const tabindex = destination.getAttribute('tabindex');
      if (tabindex === null) destination.setAttribute('tabindex', '-1');
      destination.focus({ preventScroll: true });
      if (tabindex === null) destination.removeAttribute('tabindex');
    }
    record.link.remove();
    records.delete(element);
  };

  const readingAnchor = () => {
    const win = doc.defaultView!;
    // Prefer visible reading content over sticky headers and extension UI.
    for (const y of [100, 180, 260]) {
      for (const fraction of [0.5, 0.3, 0.7]) {
        const element = doc.elementFromPoint(win.innerWidth * fraction, y);
        if (element?.closest('.markdown-body')) return element;
      }
    }
    return null;
  };

  return {
    update(entries: DiscoveredImage[], enabled: boolean) {
      if (!records.size && (!enabled || !entries.length)) return;
      const anchor = readingAnchor();
      const top = anchor?.getBoundingClientRect().top;
      let nextAnchor = anchor;
      const current = new Set(enabled ? entries.map((entry) => entry.element) : []);
      for (const [element, record] of records) {
        const target = imageTarget(element);
        const insertion = element.closest('a') ?? target;
        if (
          !current.has(element) ||
          target !== record.target ||
          !record.link.isConnected ||
          record.link.parentNode !== insertion.parentNode
        ) {
          if (anchor && record.link.contains(anchor)) nextAnchor = record.target;
          restore(element, record);
        }
      }
      if (enabled && entries.length && !style.isConnected) doc.head.append(style);
      for (const { element, image } of enabled ? entries : []) {
        let record = records.get(element);
        if (!record) {
          const target = imageTarget(element);
          const insertion = element.closest('a') ?? target;
          const link = doc.createElement('a');
          link.setAttribute(PLACEHOLDER, '');
          ownedNodes.add(link);
          const action = doc.createElement('span');
          action.textContent = 'View in PR Lens';
          const label = doc.createElement('span');
          link.append(action, label);
          insertion.before(link);
          target.setAttribute(COLLAPSED, '');
          record = { target, link };
          records.set(element, record);
          imagesByLink.set(link, element);
          if (anchor && target.contains(anchor)) nextAnchor = link;
        }
        const text = `View in PR Lens · ${image.title}`;
        const label = ` · ${image.title}`;
        if (record.link.lastChild!.textContent !== label)
          record.link.lastChild!.textContent = label;
        if (record.link.title !== text) record.link.title = text;
        if (record.link.href !== image.originalUrl) record.link.href = image.originalUrl;
      }
      if (!records.size) style.remove();
      if (nextAnchor?.isConnected && top !== undefined) {
        const delta = nextAnchor.getBoundingClientRect().top - top;
        if (delta) doc.defaultView!.scrollBy({ top: delta, behavior: 'instant' });
      }
    },
    clickedImage(event: MouseEvent): HTMLImageElement | null {
      if (!isOrdinaryClick(event) || !(event.target instanceof Element)) return null;
      const link = event.target.closest<HTMLAnchorElement>(`a[${PLACEHOLDER}]`);
      return link ? (imagesByLink.get(link) ?? null) : null;
    },
    focusTarget(element: HTMLImageElement): HTMLAnchorElement | null {
      return records.get(element)?.link ?? null;
    },
    resolveReturnFocus(target: HTMLElement | null): HTMLElement | null {
      const element = target instanceof HTMLAnchorElement ? imagesByLink.get(target) : null;
      if (!element) return target;
      return (
        records.get(element)?.link ??
        element.closest('a') ??
        (element.hasAttribute('tabindex') ? element : doc.body)
      );
    },
    dispose() {
      for (const [element, record] of records) restore(element, record);
      style.remove();
    },
  };
}
