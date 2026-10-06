import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'PR Lens',
    description:
      'View GitHub pull request images in a carousel with zoom, pan, and light/dark themes.',
    permissions: ['storage'],
    minimum_chrome_version: '120',
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'",
    },
    icons: {
      16: 'pr-lens-16.png',
      32: 'pr-lens-32.png',
      48: 'pr-lens-48.png',
      128: 'pr-lens-128.png',
    },
  },
});
