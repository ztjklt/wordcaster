import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, proxy: { '/api': 'http://localhost:8787' } },
  build: { target: 'es2022', rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
});
