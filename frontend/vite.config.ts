import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project at /3ds_performance_summerplan/, so
  // BUILT asset URLs must carry that prefix. Dev stays at / so the local
  // server, proxy, and preview tooling keep working unchanged.
  base: command === 'build' ? '/3ds_performance_summerplan/' : '/',
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
