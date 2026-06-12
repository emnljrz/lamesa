import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'], // Crucial for Codecov
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        'packages/angular/**',
        'vitest.config.ts',
				'**/index.ts'
      ],
    },
  },
})