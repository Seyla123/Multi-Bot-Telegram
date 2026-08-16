import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          // If browser is requesting an HTML document page, do not proxy — serve Vue SPA index.html
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      '/telegram': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      '/storage': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    }
  }
})
