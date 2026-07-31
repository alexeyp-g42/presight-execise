import { describe, expect, it } from 'vitest'

/* Smoke test for the wiring, and a guard: the server project must run in the
   node environment. A query test that passes only because jsdom put `window`
   in scope is a real failure mode, and it stays invisible until the day the
   two configs are accidentally merged into one. */
describe('server test environment', () => {
  it('runs in the node environment, with no DOM globals in scope', () => {
    expect('window' in globalThis).toBe(false)
    expect('document' in globalThis).toBe(false)
  })

  it('does not leak vitest globals — every API is imported explicitly', () => {
    expect('describe' in globalThis).toBe(false)
  })
})
