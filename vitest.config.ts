import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/build/**/*.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
