import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'frontend',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [react(), {
    name: 'translator-api',
    async configureServer(server) {
      const { apiMiddleware } = await import('./backend/api.js');
      server.middlewares.use(apiMiddleware);
    },
    async configurePreviewServer(server) {
      const { apiMiddleware } = await import('./backend/api.js');
      server.middlewares.use(apiMiddleware);
    }
  }],
  server: {
    port: 3000,
    open: false
  }
});
