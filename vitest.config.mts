import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Components are render-only, so the few that are worth testing can be
    // asserted as markup — no DOM environment needed.
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
  },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
})
