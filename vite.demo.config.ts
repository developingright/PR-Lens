import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const demoTsconfig = fileURLToPath(new URL('./demo/tsconfig.json', import.meta.url));

export default defineConfig({
  root: 'demo',
  // Shared viewer files must use the demo config too, rather than WXT's generated types.
  tsconfig: demoTsconfig,
  optimizeDeps: { rolldownOptions: { tsconfig: demoTsconfig } },
  server: { port: 5173, strictPort: true },
});
