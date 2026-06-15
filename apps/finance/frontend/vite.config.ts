import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'fin-saptta',
        short_name: 'finsaptta',
        description: 'Accounts & Finance SaaS',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Served behind the nginx front door on :8080 as {workspace}.localhost.
    allowedHosts: ['localhost', '.localhost'],
    hmr: { clientPort: 8080 },
    // Windows/Docker bind mounts don't emit native FS events, so edits never
    // reach Vite's watcher. Poll instead so HMR works without a container restart.
    watch: { usePolling: true, interval: 200 },
  },
});
