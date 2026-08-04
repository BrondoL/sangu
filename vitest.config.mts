import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Node by default: most components are render-only and can be asserted as
    // markup, which needs no DOM and costs nothing to start. The two files
    // that test behaviour across time rather than output at one moment ask for
    // a DOM themselves, with a `// @vitest-environment jsdom` docblock, so
    // they pay for it alone.
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
  },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
})
