import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

/* Testing Library unmounts automatically only by hooking a *global* afterEach,
   which does not exist while `globals: false` — so it is registered here by
   hand. Without these three lines the symptom is tests that pass alone and
   fail together, because every render stacks up in the same document. */
afterEach(cleanup);
