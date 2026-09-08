import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    // Produksjonsbundlen dro med seg 10 MB kart som ingen leser.
    sourcemap: mode !== 'production',
    minify: 'esbuild',
    target: 'ES2020',
  },
  server: {
    port: 3000,
    open: true,
  },
}));
