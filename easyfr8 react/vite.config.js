import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  css: {
    lightningcss: {
      // Bootstrap 3 uses IE7 star-hack (*display: inline) — allow errorRecovery
      errorRecovery: true,
    }
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to local Next.js backend API
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    cssCodeSplit: false,
    cssMinify: false
  }
})
