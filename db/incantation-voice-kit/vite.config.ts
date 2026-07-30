import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'IncantationVoiceKit',
      formats: ['es', 'iife'],
      fileName: (format) => format === 'es'
        ? 'incantation-voice-kit.es.js'
        : 'incantation-voice-kit.iife.js',
      cssFileName: 'incantation-voice-kit',
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    copyPublicDir: false,
    assetsInlineLimit: 32_768,
  },
});
