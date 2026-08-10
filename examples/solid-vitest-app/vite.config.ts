/// <reference types="vitest" />
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid({ hot: false })],
  resolve: {
    preserveSymlinks: true,
    conditions: ['development', 'browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.tsx'],
    server: {
      deps: {
        inline: [/@testing-library/],
      },
    }
  },
  server: {
    fs: {
      strict: false,
    }
  }
})
