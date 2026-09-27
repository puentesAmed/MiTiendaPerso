import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve:{alias:{'@':'/src'}},
  server:{port:5173},
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-animation': ['framer-motion'],
          'vendor-swiper': ['swiper'],
          'vendor-konva': ['react-konva', 'konva'],
          'vendor-utils': ['axios', 'uuid', 'archiver', 'node-fetch'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
