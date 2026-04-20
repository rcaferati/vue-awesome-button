import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const entry = (path: string) => resolve(__dirname, path);

export default defineConfig({
  plugins: [vue()],
  build: {
    sourcemap: true,
    lib: {
      entry: {
        index: entry('src/index.ts'),
        AwesomeButton: entry('src/AwesomeButton.ts'),
        AwesomeButtonProgress: entry('src/AwesomeButtonProgress.ts'),
        AwesomeButtonSocial: entry('src/AwesomeButtonSocial.ts'),
        plugin: entry('src/plugin.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'js'}`,
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
