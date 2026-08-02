import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The API contract lives with the server, which owns it. Importing it here
    // keeps a single definition of the response shapes and the sort-field
    // values. Must stay in step with `paths` in tsconfig.json.
    alias: {
      '@contract': path.resolve(import.meta.dirname, '../server/src/shared/contract.ts'),
    },
  },
  server: {
    port: 5173,
    // Same single-origin model as nginx in Docker, so CORS never comes up.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
