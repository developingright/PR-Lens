# PR Lens

A Chrome extension for viewing GitHub pull request images without opening extra tabs. Browse screenshots through a filmstrip, zoom and pan, and switch between light and dark themes.

## Try it locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run demo
```

Open <http://127.0.0.1:5173> and click a screenshot. The demo uses the same viewer as the extension, with synthetic images and development-only edge-case fixtures.

## Install the extension

```sh
npm run build
```

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select this project's `.output/chrome-mv3` directory.
3. Refresh an open GitHub PR, then click an embedded screenshot.

Left/right arrows browse, Home/End jump to the first/last image, and Escape closes. The viewer offers fit, zoom, pan, and Auto / Light / Dark appearance. Modified and middle clicks keep their normal browser behavior. **Open image in new tab** is an optional action.

Previous/next buttons sit together beneath the preview. Pinch or hold Ctrl/⌘ while scrolling to zoom around the pointer; drag or use two-finger scrolling to pan a zoomed image. Touchscreen pinch and one-finger pan are supported. Double-click to zoom or return to fit.

The gallery includes images rendered in the current PR page and adds images when GitHub loads more comments. It does not fetch unloaded discussion pages or require a GitHub token. Private attachments use the page's existing image sources; authenticated repository behavior requires a manual browser check.

Read [DEVELOPERS_GUIDE.md](DEVELOPERS_GUIDE.md) for architecture, commands, test coverage, and contribution guidance. Automated contributors must also follow [AGENTS.md](AGENTS.md).
