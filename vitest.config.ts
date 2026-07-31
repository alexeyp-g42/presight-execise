import { defineConfig } from "vitest/config";

/* The root only aggregates. Each package owns its own config — the client needs
   jsdom plus a setup file, and a server test that passes only because `window`
   leaked into scope is a real failure mode. Referencing the directories makes
   Vitest load `server/vitest.config.ts` and `client/vite.config.ts` unchanged,
   so `pnpm --filter server test` and `pnpm test --project server` run the same
   configuration. */
export default defineConfig({
  test: {
    projects: ["./server", "./client"],
    /* Permanent, not scaffolding: `vitest run` exits 1 when it finds no test
       files, so without this CI is red from the first commit and stays red
       whenever `--project` is narrowed to a package whose tests have not
       landed yet. It has to live here — `passWithNoTests` is read only from
       the root config, and a copy inside a project config is ignored with no
       warning. The copies in the package configs are not redundant: each is
       the root config for that package's own `pnpm test`. */
    passWithNoTests: true,
  },
});
