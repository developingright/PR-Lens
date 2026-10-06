export type InputMode = 'pointer' | 'keyboard';

export interface GalleryImage {
  id: string;
  src: string;
  originalUrl: string;
  title: string;
  context: string;
  sourceUrl: string | null;
}

export interface GallerySnapshot {
  items: GalleryImage[];
  activeId: string | null;
  open: boolean;
  inputMode: InputMode;
  returnFocus: HTMLElement | null;
}

export class GalleryStore {
  private snapshot: GallerySnapshot = {
    items: [],
    activeId: null,
    open: false,
    inputMode: 'pointer',
    returnFocus: null,
  };
  private listeners = new Set<() => void>();

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(patch: Partial<GallerySnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  update(items: GalleryImage[]) {
    if (JSON.stringify(items) === JSON.stringify(this.snapshot.items)) return;
    const previousIndex = this.snapshot.items.findIndex(
      (item) => item.id === this.snapshot.activeId,
    );
    const currentStillExists = items.some((item) => item.id === this.snapshot.activeId);
    const activeId = currentStillExists
      ? this.snapshot.activeId
      : (items[Math.max(0, Math.min(previousIndex, items.length - 1))]?.id ?? null);
    this.publish({ items, activeId, open: this.snapshot.open && items.length > 0 });
  }

  show(id: string, returnFocus: HTMLElement | null, inputMode: InputMode = 'pointer') {
    if (!this.snapshot.items.some((item) => item.id === id)) return;
    this.publish({ activeId: id, returnFocus, inputMode, open: true });
  }

  select = (id: string) => {
    if (this.snapshot.items.some((item) => item.id === id)) this.publish({ activeId: id });
  };

  setInputMode = (inputMode: InputMode) => {
    if (inputMode !== this.snapshot.inputMode) this.publish({ inputMode });
  };

  close = () => {
    this.publish({ open: false });
  };
  reset = () => {
    this.publish({ items: [], activeId: null, open: false, returnFocus: null });
  };
}

/** Keep authentication signatures intact; never turn page data into executable links. */
export function httpsUrl(value: string | null, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
