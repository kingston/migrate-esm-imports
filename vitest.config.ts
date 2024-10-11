import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    root: './src',
    mockReset: true,
    server: {
      deps: {
        inline: ['get-tsconfig'],
      },
    },
  },
});
