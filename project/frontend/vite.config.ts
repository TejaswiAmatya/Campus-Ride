import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync } from 'fs'

const runningInDocker = existsSync('/.dockerenv')
const defaultProxyTarget = runningInDocker
  ? 'http://backend:8000'
  : 'http://localhost:8000'
const proxyTarget = process.env.VITE_PROXY_TARGET ?? defaultProxyTarget

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.unit.test.{ts,tsx}',
      'src/**/*.integration.test.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // In development (Vite dev server), proxy API calls to backend.
      // - Local dev:    http://localhost:8000
      // - Docker dev:   http://backend:8000
      // You can override either with VITE_PROXY_TARGET.
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor'
          }
          if (id.includes('node_modules/@tanstack/react-query/')) {
            return 'query'
          }
          if (
            id.includes('node_modules/leaflet/') ||
            id.includes('node_modules/react-leaflet/')
          ) {
            return 'map'
          }
        },
      },
    },
  },
})
