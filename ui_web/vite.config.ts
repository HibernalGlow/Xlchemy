import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5000,
    strictPort: false,
    host: false,
    hmr: {
      protocol: 'ws',
      port: 5001,
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-icons', '@radix-ui/react-select', '@radix-ui/react-checkbox'],
        },
      },
    },
  },
  base: './',
  esbuild: {
    legalComments: 'none',
    target: 'esnext',
  },
});
