import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'PR Lens',
    description:
      'A quieter way to review screenshots. An image viewer and filmstrip for GitHub PRs.',
    permissions: ['storage'],
    minimum_chrome_version: '120',
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'",
    },
    icons: { 16: 'icon-16.png', 32: 'icon-32.png', 48: 'icon-48.png', 128: 'icon-128.png' },
  },
});
