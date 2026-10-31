import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    exclude: [...configDefaults.exclude, '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // `server-only` throws outside the Next.js server bundle; stub it in tests.
      'server-only': path.resolve(
        import.meta.dirname,
        './src/__tests__/server-only-stub.ts'
      ),
    },
  },
})
