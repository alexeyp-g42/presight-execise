import type { FacetsResponse } from "@presight/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacetFilterSidebar, type FacetFilterSidebarProps } from "./FacetFilterSidebar";

/* What the sidebar owns once the rows themselves moved to
   `FacetSelectionControls`, which has its own suite: the landmark it puts them
   in, the result count above them, and holding its place before the first
   response lands.

   Nothing here asserts that it is hidden below `lg`. jsdom evaluates no media
   queries and applies no cascade, so `hidden lg:block` is a string literal to
   it — that half is verified by hand. */

const facets: FacetsResponse = {
  total: 1234,
  hobbies: [{ value: "chess", count: 88 }],
  nationalities: [{ value: "Germany", count: 500 }],
};

const renderSidebar = (overrides: Partial<FacetFilterSidebarProps> = {}) => {
  render(
    <FacetFilterSidebar
      facets={facets}
      shownCount={50}
      selectedHobbies={[]}
      selectedNationalities={[]}
      onToggleHobby={vi.fn()}
      onToggleNationality={vi.fn()}
      {...overrides}
    />,
  );
};

describe("FacetFilterSidebar", () => {
  it("offers both facets inside one landmark", () => {
    renderSidebar();

    const sidebar = screen.getByRole("complementary", { name: /filter/i });

    expect(sidebar).toContainElement(screen.getByRole("region", { name: "Hobbies" }));
    expect(sidebar).toContainElement(screen.getByRole("region", { name: "Nationalities" }));
  });

  it("shows how much of the result set is on screen", () => {
    renderSidebar({ shownCount: 50 });

    expect(screen.getByText(/showing/i)).toHaveTextContent(
      `Showing ${(50).toLocaleString()} of ${(1234).toLocaleString()}`,
    );
  });

  it("holds its place while the first facet response is still in flight", () => {
    renderSidebar({ facets: undefined });

    expect(screen.getByRole("complementary", { name: /filter/i })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
