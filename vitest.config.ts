import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    root: './src',
    mockReset: true,
  },
});
