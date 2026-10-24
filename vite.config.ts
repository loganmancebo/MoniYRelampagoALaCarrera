import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173 },
  // Phaser ocupa ~1,5 MB sin comprimir (~340 KB gzip); es lo esperado.
  build: { chunkSizeWarningLimit: 1600 },
});
