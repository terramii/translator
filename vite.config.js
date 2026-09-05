import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { apiMiddleware } from './backend/api.js';

export default defineConfig({
  root: 'frontend',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [react(), { name: 'translator-api', configureServer(server) { server.middlewares.use(apiMiddleware); }, configurePreviewServer(server) { server.middlewares.use(apiMiddleware); } }],
  server: {
    port: 3000,
    open: false
  }
});
