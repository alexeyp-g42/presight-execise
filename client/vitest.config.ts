import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@contract': path.resolve(import.meta.dirname, '../server/src/shared/contract.ts'),
    },
  },
});
