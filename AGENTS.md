# Development rules

Read [DEVELOPERS_GUIDE.md](DEVELOPERS_GUIDE.md) before changing architecture, extension behavior, or build tooling. Keep it accurate whenever those change. Read the relevant files under `.agents/skills/` before applying a skill.

## Product and scope

- PR Lens is a Chrome Manifest V3 extension for viewing embedded GitHub PR images in a modal and thumbnail gallery.
- Ordinary image clicks open the viewer; modified/middle clicks retain native browser behavior.
- Support Auto, Light, and Dark themes. Never modify GitHub's theme or global design tokens.
- Initial discovery covers images rendered in the current PR page, with updates as GitHub loads comments. Do not describe this as exhaustive access to unloaded PR content.
- Preserve the user's work, page position, and focus. Do not interfere with editors, unrelated links, or GitHub shortcuts outside the modal.

## Architecture

- Keep GitHub-specific selectors, metadata extraction, and route logic in `src/github/`. Viewer components must not know GitHub's DOM structure.
- Keep the gallery model and URL validation independent of React and extension APIs.
- Mount the viewer in a Shadow DOM. All dialogs/portals must target its container, not `document.body`.
- Clean up listeners, observers, animation frames, React roots, and DOM references on invalidation or navigation. Never start unbounded polling.
- Batch discovery updates and ignore mutations produced by the extension. Avoid a full document scan on every mutation.
- Preserve signed image query parameters. Resolve page URLs with the URL API; keep display sources and original links distinct.

## Privacy and extension security

- Request only necessary permissions. The baseline is GitHub.com content-script access and `storage` for theme preferences. Explain additions in the developer guide.
- Do not add `<all_urls>`, cookies, history, tabs, downloads, or cross-origin fetch access without a feature that requires it.
- Bundle executable code locally. No remote JavaScript, `eval`, inline executable strings, or weakening the production Content Security Policy.
- Treat DOM content, URLs, PR text, and attachment metadata as untrusted. Render text through React or `textContent`, never `dangerouslySetInnerHTML`.
- Accept only appropriate HTTPS image/original URLs. Reject executable URL schemes. Never strip authentication parameters or log signed URLs.
- Keep screenshot content and PR metadata in memory. Persist preferences only; no analytics, image uploads, private fixtures, or tokens.
- If messaging is added, validate sender identity and message shape before privileged actions. Do not expose arbitrary fetch/tab-opening proxies to the page.

## UI and accessibility

- Use semantic buttons and links, accessible names, visible focus, and meaningful image alternatives.
- Use Base UI for the dialog's modal behavior. Verify its focus trap, screen-reader naming, Escape, scroll lock, and focus restoration across the Shadow DOM.
- Keep controls usable at 200% browser zoom and narrow viewport widths. Long metadata must not push actions off-screen.
- Preserve original image aspect ratio and colors. Fit screenshots into the stage and provide zoom/pan for detail.
- Ship loading, empty, single-image, and failed-image behavior with the feature.
- Use `emil-design-eng` and `apple-design` for hierarchy and polish; `animate` for construction; `review-animations` before finishing motion changes; `break-ui` for realistic stress fixtures.
- Apply other local skills when their use cases fit. Do not add Swift, Expo, toasts, or extra dependencies solely to exercise a skill.

## Motion

- Justify motion with feedback or spatial/state clarity. Keyboard actions and repeated gallery navigation are immediate.
- Animate only transform and opacity for normal UI. Use shared easing/duration tokens; never `transition: all`, `scale(0)`, or slow decorative carousel slides.
- Keep normal UI transitions below 300 ms. Reduced-motion support and pointer/hover gating ship with the implementation.
- Track panning directly with pointer capture; do not animate behind the pointer or lock interaction during transitions.

## Code, dependencies, and verification

- TypeScript strict mode; prefer small cohesive functions, explicit boundary validation, and derived state over duplicate state.
- Keep runtime dependencies deliberate. Commit the npm lockfile and use `npm ci` for reproducible installs.
- Avoid speculative abstractions, broad rewrites, swallowed failures, or tests that merely repeat implementation details.
- Test behavior at boundaries: route changes, rendered-comment discovery, image exclusions, unsafe URLs, preserved modifier clicks, focus, and gallery navigation.
- Run `npm run check` after functional changes and `npm run test:e2e` for content-script/dialog changes. Run `npm run format:check` before delivery.
- Visually inspect Light and Dark, loading/error states, extreme aspect ratios, long metadata, and reduced motion. Report manual/private-repository checks separately from fixture tests.
- If a check cannot run, state the reason and preserve a concrete reproducible command. Never claim an unrun check passed.
- Verify current API behavior against official Chrome, WXT, Base UI, React, and browser documentation when uncertain.

## Git and collaboration

- `PROJECT_PLAN.md`, `plans/`, and `animation-plans/` are local planning artifacts; keep them ignored and out of commits.
- Never commit credentials, `.env` values, dependencies, generated extension builds, test screenshots, or user browsing data.
- Do not discard user changes, rewrite history, add remotes, publish, or push unless requested. Keep changes reviewable and describe what was tested.
- Use clear, concise explanations. A little humor is welcome; unsupported hype is not.
