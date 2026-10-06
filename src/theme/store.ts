export type ThemePreference = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'auto' || value === 'light' || value === 'dark';
}

interface ThemeStorage {
  load: () => Promise<unknown>;
  save: (value: ThemePreference) => Promise<void>;
}

export function createThemeStore(doc: Document, storage: ThemeStorage) {
  const win = doc.defaultView!;
  const media = win.matchMedia('(prefers-color-scheme: dark)');
  let disposed = false;
  let changedByUser = false;
  let snapshot: { preference: ThemePreference; resolved: Theme } = {
    preference: 'auto',
    resolved: 'light',
  };
  const listeners = new Set<() => void>();

  const resolve = () => {
    const preference = snapshot.preference;
    const githubMode = doc.documentElement.getAttribute('data-color-mode');
    const computedScheme = win.getComputedStyle(doc.documentElement).colorScheme;
    const automatic: Theme =
      githubMode === 'dark' || githubMode === 'light'
        ? githubMode
        : computedScheme === 'dark' || computedScheme === 'light'
          ? computedScheme
          : media.matches
            ? 'dark'
            : 'light';
    const resolved = preference === 'auto' ? automatic : preference;
    if (resolved !== snapshot.resolved) snapshot = { ...snapshot, resolved };
  };
  const publish = () => {
    resolve();
    listeners.forEach((listener) => listener());
  };
  const observer = new MutationObserver(publish);
  observer.observe(doc.documentElement, {
    attributes: true,
    attributeFilter: ['data-color-mode', 'data-light-theme', 'data-dark-theme', 'style'],
  });
  media.addEventListener('change', publish);
  resolve();
  void storage
    .load()
    .then((value) => {
      if (disposed || changedByUser || !isThemePreference(value)) return;
      snapshot = { ...snapshot, preference: value };
      publish();
    })
    .catch(() => {
      /* Preferences are optional; the viewer still works. */
    });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPreference: (preference: ThemePreference) => {
      changedByUser = true;
      snapshot = { ...snapshot, preference };
      publish();
      void storage.save(preference).catch(() => {
        /* In-memory selection remains usable. */
      });
    },
    dispose: () => {
      disposed = true;
      observer.disconnect();
      media.removeEventListener('change', publish);
      listeners.clear();
    },
  };
}

export type ThemeStore = ReturnType<typeof createThemeStore>;
