import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

/* Testing Library unmounts automatically only by hooking a *global* afterEach,
   which does not exist while `globals: false` — so it is registered here by
   hand. Without these three lines the symptom is tests that pass alone and
   fail together, because every render stacks up in the same document. */
afterEach(cleanup);

/* jsdom ships no `matchMedia` at all — not a stub that answers `false`, but an
   undefined property — so anything that asks which breakpoint it is in throws
   `window.matchMedia is not a function` on render. That is the same missing
   half as the missing layout: jsdom has no viewport to answer about.
 *
 * Answering `false` puts every test at the narrow breakpoint, which is a real
 * answer rather than a pretend one, and the listener is a no-op because nothing
 * here can ever change width. This is the environment's gap, so it is patched
 * once here rather than guarded for in the component that asks. */
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      media: query,
      matches: false,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
