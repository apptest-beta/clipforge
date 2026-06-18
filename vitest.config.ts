import { defineConfig } from 'vitest/config'

// Unit tests target the pure helper modules in lib/ (no DOM/Next runtime
// needed), so a plain node environment keeps the suite fast.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
