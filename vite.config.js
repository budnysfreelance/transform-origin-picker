import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Wszystko jest inline'owane w jeden plik, więc `base` nie ma znaczenia:
// ten sam dist/index.html działa i na GitHub Pages, i po dwukliku z dysku (file://).
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
