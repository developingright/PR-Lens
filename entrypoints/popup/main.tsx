import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { browser } from 'wxt/browser';
import { isThemePreference, type ThemePreference } from '../../src/theme/store';
import './style.css';

function Settings() {
  const [enabled, setEnabled] = useState(true);
  const [collapseImages, setCollapseImages] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>('auto');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    let changed = false;
    const onChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (disposed || area !== 'local') return;
      if (changes.enabled || changes.theme || changes.collapseImages) changed = true;
      if (changes.enabled) setEnabled(changes.enabled.newValue !== false);
      if (changes.collapseImages) setCollapseImages(changes.collapseImages.newValue === true);
      if (changes.theme) {
        const value: unknown = changes.theme.newValue;
        setTheme(isThemePreference(value) ? value : 'auto');
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    void browser.storage.local.get(['enabled', 'theme', 'collapseImages']).then(
      (settings) => {
        if (disposed) return;
        if (!changed) {
          setEnabled(settings.enabled !== false);
          setCollapseImages(settings.collapseImages === true);
          setTheme(isThemePreference(settings.theme) ? settings.theme : 'auto');
        }
        setReady(true);
      },
      () => {
        if (!disposed) setError('Could not load settings. Reopen this panel to try again.');
      },
    );
    return () => {
      disposed = true;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const save = async (
    settings: { enabled: boolean } | { theme: ThemePreference } | { collapseImages: boolean },
  ) => {
    setSaving(true);
    setError('');
    try {
      if ('enabled' in settings) await browser.storage.local.set({ enabled: settings.enabled });
      else if ('theme' in settings) await browser.storage.local.set({ theme: settings.theme });
      else await browser.storage.local.set({ collapseImages: settings.collapseImages });
      if ('enabled' in settings) setEnabled(settings.enabled);
      if ('theme' in settings) setTheme(settings.theme);
      if ('collapseImages' in settings) setCollapseImages(settings.collapseImages);
    } catch {
      setError('Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main data-theme={theme}>
      <header>
        <img src="/pr-lens-48.png" width="32" height="32" alt="" />
        <div>
          <h1>PR Lens</h1>
          <p>A closer look, fewer tabs.</p>
        </div>
      </header>
      <section className="enable-row">
        <div>
          <label htmlFor="enabled">Enable PR Lens</label>
          <p id="enabled-help">
            {enabled ? 'Open PR images in the viewer.' : 'Images use normal GitHub links.'}
          </p>
        </div>
        <input
          id="enabled"
          className="switch"
          type="checkbox"
          role="switch"
          aria-describedby="enabled-help"
          checked={enabled}
          disabled={!ready || saving}
          onChange={(event) => void save({ enabled: event.target.checked })}
        />
      </section>
      <section className="enable-row collapse-row">
        <div>
          <label htmlFor="collapse-images">Collapse PR images</label>
          <p id="collapse-images-help">
            Replace images with text links. View them in PR Lens.
            {!enabled && ' Takes effect when PR Lens is enabled.'}
          </p>
        </div>
        <input
          id="collapse-images"
          className="switch"
          type="checkbox"
          role="switch"
          aria-describedby="collapse-images-help"
          checked={collapseImages}
          disabled={!ready || saving}
          onChange={(event) => void save({ collapseImages: event.target.checked })}
        />
      </section>
      <fieldset disabled={!ready || saving}>
        <legend>Default appearance</legend>
        <div className="theme-options">
          {(
            [
              { value: 'auto', label: 'Auto', Icon: Monitor },
              { value: 'light', label: 'Light', Icon: Sun },
              { value: 'dark', label: 'Dark', Icon: Moon },
            ] as const
          ).map(({ value, label, Icon }) => (
            <label className="theme-option" key={value}>
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => void save({ theme: value })}
              />
              <span>
                <Icon size={17} strokeWidth={1.6} />
                {label}
              </span>
            </label>
          ))}
        </div>
        <p>Auto follows GitHub’s theme. Changes apply to open viewers, too.</p>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer>Settings save automatically.</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Settings />);
