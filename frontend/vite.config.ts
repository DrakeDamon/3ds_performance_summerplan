import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(() => ({
  // Served at the custom domain root (3dsperformance.com) — GitHub Pages
  // custom domains host at /, so no path prefix in builds or dev.
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Local dev: forwards /api to FastAPI so the frontend never knows a hostname.
      '/api': 'http://localhost:8000',
    },
  },
}))
