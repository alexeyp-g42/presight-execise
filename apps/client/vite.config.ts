import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Where the API server is reachable in dev. Override when port 3000 is taken by something else. */
const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:3000'

export default defineConfig({
    plugins: [react()],
    server: {
        // strictPort makes a clash fail loudly rather than silently moving to another port.
        port: 5175,
        strictPort: true,
        proxy: {
            // Mirrors what nginx does in the container, so `/api` means the same thing in dev and
            // in production and the client never needs to know which origin the API is on.
            // The server exposes its routes at the root, so the prefix is stripped on the way out.
            '/api': {
                target: API_TARGET,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
})
