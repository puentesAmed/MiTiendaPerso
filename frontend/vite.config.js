import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve:{alias:{'@':'/src'}},
  server:{port:5174},
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-animation': ['framer-motion'],
          'vendor-konva': ['react-konva', 'konva'],
          'vendor-fabric': ['fabric'],
          'vendor-utils': ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
