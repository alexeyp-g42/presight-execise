import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    /* Explicit, not inherited: this is the assertion that the server suite
       never sees a DOM. `test/environment.test.ts` proves it. */
    globals: false,
    /* Covers `pnpm --filter server test`, where this file is the root config.
       The aggregated run reads its own copy — see `vitest.config.ts` at the
       repo root for why it cannot be inherited from here. */
    passWithNoTests: true,
  },
})
