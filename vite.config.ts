import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'ES2020',
  },
  server: {
    port: 3000,
    open: true,
  },
});
