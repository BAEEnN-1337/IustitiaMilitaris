import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'versioned-service-worker',
      generateBundle(_options, bundle) {
        const assets = Object.keys(bundle)
          .filter((name) => /\.(js|css)$/.test(name))
          .map((name) => '/' + name);
        const source = readFileSync(
          new URL('./public/sw.js', import.meta.url),
          'utf8'
        )
          .replace('__BUILD_ID__', randomUUID())
          .replace('[] /* BUILD_ASSETS */', JSON.stringify(assets));
        this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
