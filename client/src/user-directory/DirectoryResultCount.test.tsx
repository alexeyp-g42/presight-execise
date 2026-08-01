import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DirectoryResultCount } from "./DirectoryResultCount";

/* Client seam 3. The second number is the result-set `total`, which only the
   facets endpoint returns — the list endpoint answers a page and deliberately
   cannot say what stands behind it. */

describe("DirectoryResultCount", () => {
  it("shows how many of the result set are on screen", () => {
    render(<DirectoryResultCount shownCount={50} total={1234} />);

    /* Formatted through `toLocaleString` on both sides rather than against a
       literal "1,234", which would fail under a runner in a locale that groups
       differently. */
    expect(screen.getByText(/showing/i)).toHaveTextContent(
      `Showing ${(50).toLocaleString()} of ${(1234).toLocaleString()}`,
    );
  });

  it("says so plainly when a selection matches nobody", () => {
    render(<DirectoryResultCount shownCount={0} total={0} />);

    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 0 of 0");
  });
});
