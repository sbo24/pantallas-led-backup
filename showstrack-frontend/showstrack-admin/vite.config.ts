import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    watch : {
      usePolling: true, // Use polling for file watching
      interval: 100, // Check for changes every 100ms
    },
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      // Proxy API calls to FastAPI backend
      // Docker environment: container-to-container via network
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying request:', req.method, req.url, 'to', options.target);
          });
        },
      },
    },
  },
})
