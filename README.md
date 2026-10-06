<p align="center">
  <img src="public/pr-lens-128.png" width="72" height="72" alt="PR Lens logo" />
</p>

<h1 align="center">PR Lens</h1>

<p align="center">Review screenshots. Spare your tabs.</p>

<p align="center">
  <a href="#installation"><img src="https://img.shields.io/badge/Chrome-120%2B-4285F4?style=flat-square" alt="Chrome 120 or newer" /></a>
  <a href="#development"><img src="https://img.shields.io/badge/Manifest-V3-8B5CF6?style=flat-square" alt="Chrome Manifest V3" /></a>
  <a href="#development"><img src="https://img.shields.io/badge/Node.js-24_LTS-339933?style=flat-square" alt="Node.js 24 LTS" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="#installation">Install</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#development">Develop</a> ·
  <a href="#contributing">Contribute</a> ·
  <a href="LICENSE">MIT License</a>
</p>

PR Lens is a Chrome extension that opens embedded GitHub pull request images in a compact viewer. Browse screenshots from the description and comments, inspect details with zoom and pan, and return to the review without collecting extra tabs.

Because reviewing a UI change shouldn't leave you with twelve tabs named “image.png”.

## ✨ Features

- **One gallery per PR.** Browse rendered images from descriptions, comments, and review threads through a centered thumbnail strip.
- **Room for detail.** Fit images to the preview, zoom up to 400%, and pan with a mouse, trackpad, or touchscreen.
- **Less mouse mileage.** Previous, next, and zoom controls sit together beneath the preview. Keyboard shortcuts support quick browsing.
- **Your preferred appearance.** Choose Light, Dark, or Auto. Auto follows GitHub's appearance with an operating-system fallback.
- **Context when you need it.** Jump back to the selected image's description or comment, or explicitly open the original image in a new tab.
- **Accessible interactions.** Modal focus management, named controls, keyboard navigation, and reduced-motion support.

<a id="installation"></a>

## 📦 Installation

### Build and load in Chrome

Requirements: **Chrome 120 or newer**, **Node.js 24 LTS**, **npm**, and **Git**.

```sh
git clone https://github.com/developingright/PR-Lens.git
cd PR-Lens
npm ci
npm run build
```

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose `.output/chrome-mv3` inside the cloned repository.
4. Refresh an open GitHub pull request and click an embedded screenshot.

After updating the code, run `npm run build`, select **Reload** on the extension's card, and refresh the GitHub page.

### Preview without installing

After installing dependencies, run:

```sh
npm run demo
```

Open [localhost:5173](http://127.0.0.1:5173) and click a screenshot. The demo uses the same viewer as the extension with synthetic PR content, including fixtures for narrow layouts, long metadata, and large galleries. Give it a spin before inviting it into your browser.

<a id="usage"></a>

## 🎛️ Usage

Click an embedded image on a GitHub PR to open the viewer. Select a thumbnail or use the adjacent previous/next controls to browse.

| Action                   | Control                                                 |
| ------------------------ | ------------------------------------------------------- |
| Previous / next image    | `←` / `→`, navigation buttons, or thumbnails            |
| First / last image       | `Home` / `End`                                          |
| Close the viewer         | `Esc`, close button, or backdrop                        |
| Zoom in / out            | Zoom buttons, pinch, or `Ctrl` / `⌘` + scroll           |
| Pan a zoomed image       | Drag, two-finger scroll, or one-finger touchscreen drag |
| Pan horizontally         | `Shift` + vertical scroll                               |
| Toggle zoom / fit        | Double-click the preview                                |
| Reset to fit             | Fit control beneath the preview                         |
| Return to the discussion | Description or comment label in the footer              |
| Open the original image  | Open-image control in the footer                        |

Zoom follows the pointer or pinch position. Switching images resets the preview to fit. Image colors stay unchanged in every theme. Modified and middle clicks on GitHub image links retain their normal browser behavior.

## 🔒 Privacy and permissions

PR Lens works with images already rendered on the GitHub page. It does not require a GitHub token, upload screenshots, collect analytics, or persist image content or PR metadata. Only the appearance preference is stored.

| Access                                   | Purpose                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Content script on `https://github.com/*` | Detect navigation into PRs and open the viewer for eligible embedded images. Image discovery runs only on PR routes. |
| `storage`                                | Save the Auto, Light, or Dark appearance preference locally.                                                         |

The extension preserves the page's image URLs, including parameters needed for private attachments. It has no background service worker or remote executable code.

## 🧭 Scope and limitations

- Supports GitHub.com pull request pages. GitHub Enterprise Server hosts are not included in the current configuration.
- Includes images rendered on the current page and adds images as GitHub loads more discussion content. It does not fetch unloaded comments or additional discussion pages.
- Browses images one at a time. Side-by-side comparison is not available.
- Private attachment access depends on the signed-in page and attachment URL. Private repositories and physical trackpad/touchscreen interactions need manual verification; the demo's browser tests do not establish those guarantees.
- GitHub markup can change. If a screenshot stops opening in the viewer, please report a reproducible example.

<a id="development"></a>

## 🛠️ Development

Built with **WXT**, **React**, **TypeScript**, and **Base UI** using Chrome Manifest V3. The viewer mounts inside a Shadow DOM to keep its styles scoped.

```sh
npm ci
npm run dev
```

WXT starts the extension development workflow. For viewer-only work, use `npm run demo`.

| Command                | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `npm run demo`         | Run the standalone viewer demo                            |
| `npm run dev`          | Develop the extension with reload support                 |
| `npm run build`        | Build the unpacked Chrome extension                       |
| `npm run zip`          | Create a distributable extension ZIP                      |
| `npm run check`        | Run type checking, lint, unit tests, and production build |
| `npm run test:e2e`     | Run Playwright viewer tests                               |
| `npm run format:check` | Check formatting                                          |

Browser tests can use an existing Chromium installation:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/absolute/path/to/Chromium" npm run test:e2e
```

See the [developer's guide](DEVELOPERS_GUIDE.md) for architecture, browser setup, integration boundaries, and verification requirements.

<a id="contributing"></a>

## 🌱 Contributing

Bug reports, focused fixes, documentation improvements, and accessibility feedback are welcome. Small improvements count; a clearer error message can save someone's afternoon.

Before starting a larger change, [open an issue](https://github.com/developingright/PR-Lens/issues) to discuss the problem and proposed behavior. For a pull request:

1. Read the [developer's guide](DEVELOPERS_GUIDE.md) and [development rules](AGENTS.md).
2. Keep the change focused and explain the resulting behavior.
3. Run `npm run check` and `npm run format:check`. Run `npm run test:e2e` for viewer or content-script changes.
4. Include relevant test results and screenshots for visual changes. Distinguish demo checks from tests on live GitHub pages.

When reporting a bug, include the Chrome version, steps to reproduce, expected behavior, and whether it occurs in the demo or on GitHub. A public PR example helps; remove private repository content and signed attachment URLs from reports.

## 🩹 Troubleshooting

**Clicking a screenshot still opens a new tab.** Check that the extension is enabled and allowed to run on GitHub, then reload the PR page. Only eligible embedded PR images are intercepted; modified and middle clicks retain native behavior.

**Some screenshots are missing from the gallery.** Expand or load the relevant comments on GitHub. The gallery only includes rendered images.

**A rebuilt extension still looks unchanged.** Reload its card at `chrome://extensions`, then refresh GitHub. The unpacked extension must point to `.output/chrome-mv3`.

**Browser tests cannot find Chromium.** Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium executable. See the [browser setup instructions](DEVELOPERS_GUIDE.md#setup).

## 📄 License

Licensed under [MIT](LICENSE). Independent project; not affiliated with or endorsed by GitHub or Google.
