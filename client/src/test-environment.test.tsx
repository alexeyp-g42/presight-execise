import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const CleanupProbe = () => <p>rendered into jsdom</p>;

/* Smoke test for the wiring: jsdom is present, React renders into it, the
   jest-dom matchers are registered, and — the part that actually breaks —
   the setup file's explicit `afterEach(cleanup)` runs between tests. */
describe("client test environment", () => {
  it("renders a component into a jsdom document", () => {
    render(<CleanupProbe />);

    expect(screen.getByText("rendered into jsdom")).toBeInTheDocument();
  });

  it("unmounts the previous render before the next test", () => {
    render(<CleanupProbe />);

    /* Two matches here means cleanup stopped running, which is the failure
       mode `globals: false` introduces: every test passes on its own and the
       file fails as a whole. */
    expect(screen.getAllByText("rendered into jsdom")).toHaveLength(1);
  });
});
