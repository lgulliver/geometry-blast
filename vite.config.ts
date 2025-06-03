import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/geometry-blast/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})
