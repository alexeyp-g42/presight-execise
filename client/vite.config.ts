import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    name: "client",
    /* jsdom, not happy-dom: happy-dom is faster but weaker on compatibility,
       and neither implements layout — so the speed buys nothing here while
       costing fidelity. */
    environment: "jsdom",
    /* Kept off deliberately. The cost is importing `describe`/`it`/`expect`,
       which types better; the price is that Testing Library's automatic
       cleanup no longer runs, so the setup file registers it by hand. */
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    /* Covers `pnpm --filter client test` only — see the note at the root. */
    passWithNoTests: true,
  },
});
