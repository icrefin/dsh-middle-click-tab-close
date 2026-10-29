import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The test project's tsconfig uses the automatic JSX runtime; esbuild needs
  // to agree, or the `.tsx` spec compiles to `React.createElement` with no React.
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['test/**/*.spec.{ts,tsx}'],
  },
})
