# Developer's guide

PR Lens is a Chrome Manifest V3 extension. Its content script discovers embedded images on GitHub PR pages and lazily mounts a React image viewer in an isolated Shadow DOM. The same viewer runs in a standalone local demo.

This initial foundation contains the extension and demo scaffold. Automated unit/browser suites and real GitHub compatibility checks are still to be implemented; their configured commands are listed below for subsequent development.

Read [AGENTS.md](AGENTS.md) for the development contract. Project skills live in `.agents/skills/`; use them according to their actual use cases.

## Setup and commands

Use Node.js 24 LTS (`nvm use` reads `.nvmrc`) and npm. Commit `package-lock.json`, use `npm ci` after cloning, and make deliberate dependency upgrades.

| Command                | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm ci`               | Install the locked dependency tree and prepare WXT's generated types.   |
| `npm run dev`          | Run WXT development mode with extension reload support.                 |
| `npm run demo`         | Open the local UI preview at `http://127.0.0.1:5173`.                   |
| `npm run typecheck`    | Check strict TypeScript types.                                          |
| `npm run lint`         | Check TypeScript, React hooks, and JSX accessibility rules.             |
| `npm test`             | Run discovery and gallery-state unit tests.                             |
| `npm run test:e2e`     | Run browser and built-extension integration tests. Run the build first. |
| `npm run check`        | Run types, lint, unit tests, and the production build.                  |
| `npm run format:check` | Verify source/document formatting.                                      |
| `npm run build`        | Generate `.output/chrome-mv3`.                                          |
| `npm run zip`          | Create the extension package for a future distribution step.            |

Browser tests need Playwright's bundled Chromium: run `npx playwright install chromium` once. They use synthetic fixtures and a separate temporary browser profile, never your real login or Chrome profile.

## Layout and boundaries

| Path                             | Responsibility                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `entrypoints/github.content.tsx` | Chrome entry point, event interception, lifecycle, DOM observation, lazy UI mounting.     |
| `src/github/discovery.ts`        | PR route parsing, selectors, image filtering, source metadata, and image-element mapping. |
| `src/gallery/model.ts`           | Gallery types, state transitions, and safe HTTPS URL resolution.                          |
| `src/theme/store.ts`             | Auto/Light/Dark appearance, GitHub/OS theme observation, preference validation.           |
| `src/viewer/`                    | Accessible React viewer, thumbnail navigation, image loading/zoom/pan, design tokens.     |
| `demo/`                          | Synthetic PR context and dev-only edge-case fixtures. Never imported by the extension.    |
| `tests/unit/`                    | Data/DOM boundary tests independent of Chrome.                                            |
| `tests/e2e/`                     | User interactions plus production content-script tests in Chromium.                       |
| `public/`                        | Locally packaged extension icons.                                                         |

The adapter returns serializable image metadata and keeps DOM references at the integration boundary. Stable per-element IDs preserve selection across rescans. Repeated images are separate discussion occurrences; signed URLs are not canonicalized or stripped.

The gallery is an external store observed through React's `useSyncExternalStore`. It owns selection/open state; the image panel owns transient loading, fit/zoom, and pointer state. Theme persistence is injected so the demo uses local storage and the extension uses `browser.storage.local`.

## GitHub integration

The content script matches `https://github.com/*` to handle client-side navigation from a non-PR page. Actual discovery and image-click behavior are gated by the PR route. Initial support covers descriptions and rendered discussion/review content in `.markdown-body` containers.

GitHub markup is not a stable public API. Keep selectors isolated in the adapter and confirm changed selectors on real public PRs plus recorded synthetic fixtures. Do not spread GitHub selectors through React components.

Batch relevant DOM mutations into an animation frame; ignore the extension's own subtree. Observe image-source changes and newly loaded comment bodies. Reset gallery state when the route changes, and clean up observers/listeners/UI on content-script invalidation.

Only ordinary, eligible image clicks are intercepted. Preserve Ctrl/Cmd/Shift/Alt and middle clicks. An image in an editor preview, an avatar, a reaction icon, or a recognized status badge is not a gallery entry. Never take over unrelated links or non-PR pages.

Discovery is bounded by rendered content in the current page/tab. Do not silently expand every comment, call GitHub APIs, or add authentication. Cross-tab/unloaded-comment completeness is a separate feature.

## Modal, themes, and motion

All Base UI portals target a container in the Shadow DOM. Base UI supplies modal semantics and focus behavior; verify trapping, Escape, background inertness, scroll restoration, and return focus with the actual injected build. React accessibility is necessary but does not replace browser testing.

Auto appearance uses GitHub's effective theme with an OS fallback. Light/Dark overrides persist as a small preference. Theme tokens live on `.lens-root`; do not mutate GitHub's `<html>` attributes or styles. Both themes preserve the original screenshot's pixels.

Use shared CSS tokens. Pointer-triggered modal entry is 220 ms, exit is 180 ms, and easing is `cubic-bezier(0.23, 1, 0.32, 1)`. Keyboard actions and image switching are instant. Reduced motion removes spatial transforms. Panning follows the pointer directly with capture and bounds.

Use the `animate` recipes before adding motion and `review-animations` afterward. Do not introduce a spring library for a simple fade. Keep blur static and restrained, specify transition properties, and gate hover behavior by pointer capability.

## Privacy and security

The only API permission is `storage`, used for appearance. Content-script match patterns grant GitHub site access. There is no background worker, login, analytics, screenshot persistence, or remote executable code.

Use existing rendered image URLs, retaining authentication signatures. Treat GitHub text and URLs as untrusted. Use React text rendering and the URL API; accept HTTPS sources and links, reject executable schemes and credential-bearing URLs, and never log signed attachment links. New-tab links use `noopener noreferrer`.

Production code is bundled locally and uses a restrictive extension-page script policy. Do not add remote fonts/scripts or permission fields without a concrete need. New message handlers must validate sender and payload before performing privileged operations.

Only theme preference is persisted. Never capture private PR data in fixtures, screenshots, logs, telemetry, or Git history.

## Verification and contribution workflow

1. Read the relevant adapter/component and applicable skill before editing.
2. Make a focused change and update this guide when behavior, permissions, or commands change.
3. Add meaningful boundary tests for new behavior. Do not duplicate implementation in assertions.
4. Run `npm run check`, browser tests for integration changes, and formatting verification.
5. Inspect the viewer in Light and Dark, at large browser zoom and narrow viewport sizes, and with reduced motion. Check interruption by rapidly switching images and dismissing/reopening.
6. Inspect the production manifest: Manifest V3, GitHub-only match patterns, `storage` only, and no development-only permissions or demo assets.

The demo fixture switch supports ordinary screenshots, realistic long metadata/extreme image dimensions, one image, no images, and 1,000 images. These controls are local preview tools and do not ship in the extension. Loading/failed images must keep navigation and close controls reachable.

Browser fixtures prove extension behavior under known DOM structures. They do not prove compatibility with today's authenticated GitHub DOM or expiring private attachment URLs. Before release, manually check a real public PR and an accessible private PR, newly loaded comments, review threads, and client-side navigation. Report those checks separately and honestly.

Generated output, dependencies, screenshots, and test artifacts are ignored. `PROJECT_PLAN.md`, `plans/`, and `animation-plans/` remain local and must not enter commits. Do not push, publish, or add remotes as part of local setup.

## Primary references

- [Chrome manifest format](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Chrome minimal permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome extension security](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- [Chrome content scripts and isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [WXT installation](https://wxt.dev/guide/installation.html)
- [WXT content scripts and Shadow DOM](https://wxt.dev/guide/essentials/content-scripts.html)
- [Base UI dialog](https://base-ui.com/react/components/dialog)
- [Accessible dialog requirements](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/dialog_role)
- [Playwright Chrome extension testing](https://playwright.dev/docs/chrome-extensions)
- [GitHub attachment access](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)
