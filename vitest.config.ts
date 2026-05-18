import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: 'reports/coverage',
      exclude: [
        '**/node_modules/**',
        '**/*.spec.ts',
        '**/index.ts',
        '**/*.routes.ts',
        '**/*.tokens.ts',
        '**/*.model.ts',
        '**/*.mock.*',
        '**/*.config.ts',
        '**/*.d.ts',
        'src/main.ts',
      ],
    },
  },
});
