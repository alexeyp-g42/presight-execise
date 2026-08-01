import type { FacetsResponse } from "@presight/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacetFilterSidebar, type FacetFilterSidebarProps } from "./FacetFilterSidebar";

/* Client seam 3 — a jsdom render with the facet payload handed in directly.
   The wire format is already pinned by the server suite, so what is tested
   here is the half the client owns: that a payload becomes rows the viewer can
   read and press, that the chips are the *only* representation of a selection,
   and that nothing is filtered out on the way — `count: 0` included, which is
   what keeps a selection deselectable once it matches nobody. */

const facets: FacetsResponse = {
  total: 1234,
  hobbies: [
    { value: "hiking", count: 900 },
    { value: "chess", count: 88 },
    /* Pinned by the server: selected, below the cut, contributing nothing. */
    { value: "board games", count: 0 },
  ],
  nationalities: [
    { value: "Germany", count: 500 },
    /* The comma is the reason selections travel as repeated keys. */
    { value: "Korea, Republic of", count: 12 },
  ],
};

const renderSidebar = (overrides: Partial<FacetFilterSidebarProps> = {}) => {
  const onToggleHobby = vi.fn();
  const onToggleNationality = vi.fn();

  render(
    <FacetFilterSidebar
      facets={facets}
      shownCount={50}
      selectedHobbies={[]}
      selectedNationalities={[]}
      onToggleHobby={onToggleHobby}
      onToggleNationality={onToggleNationality}
      {...overrides}
    />,
  );

  return { onToggleHobby, onToggleNationality };
};

const chipsIn = (groupName: string): HTMLElement[] =>
  within(screen.getByRole("region", { name: groupName })).getAllByRole("button");

const chipLabels = (groupName: string): string[] =>
  chipsIn(groupName).map((chip) => chip.textContent ?? "");

describe("FacetFilterSidebar", () => {
  it("renders a row per hobby the facet offers, with its count", () => {
    renderSidebar();

    expect(chipLabels("Hobbies")).toEqual([
      expect.stringContaining("hiking"),
      expect.stringContaining("chess"),
      expect.stringContaining("board games"),
    ]);
    expect(chipsIn("Hobbies")[0]).toHaveTextContent("900");
  });

  it("renders a row per nationality the facet offers, with its count", () => {
    renderSidebar();

    expect(chipLabels("Nationalities")).toEqual([
      expect.stringContaining("Germany"),
      expect.stringContaining("Korea, Republic of"),
    ]);
    expect(chipsIn("Nationalities")[1]).toHaveTextContent("12");
  });

  it("marks the entries the viewer has selected in each dimension", () => {
    renderSidebar({ selectedHobbies: ["chess"], selectedNationalities: ["Germany"] });

    expect(screen.getByRole("button", { name: /chess/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /hiking/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Germany/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports a pressed hobby to the hobby handler and nothing else", () => {
    const { onToggleHobby, onToggleNationality } = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: /chess/ }));

    expect(onToggleHobby).toHaveBeenCalledExactlyOnceWith("chess");
    expect(onToggleNationality).not.toHaveBeenCalled();
  });

  it("reports a pressed nationality to the nationality handler, comma and all", () => {
    const { onToggleHobby, onToggleNationality } = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: /Korea, Republic of/ }));

    expect(onToggleNationality).toHaveBeenCalledExactlyOnceWith("Korea, Republic of");
    expect(onToggleHobby).not.toHaveBeenCalled();
  });

  it("keeps an entry contributing nothing on screen and deselectable", () => {
    /* The pinned-value case end to end: a selection narrowed to nobody comes
       back at `count: 0`, and pressing that chip is the only way back. */
    const { onToggleHobby } = renderSidebar({ selectedHobbies: ["board games"] });
    const chip = screen.getByRole("button", { name: /board games/ });

    expect(chip).toHaveTextContent("0");
    expect(chip).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(chip);

    expect(onToggleHobby).toHaveBeenCalledExactlyOnceWith("board games");
  });

  it("pins a selected entry to the top of its facet", () => {
    /* Presentation the client owns rather than ordering the server promises: a
       selected hobby lands at the result-set size and sorts up on its own, but
       a selected nationality is counted with its own selection dropped and does
       not — so the sidebar puts it there. */
    renderSidebar({ selectedNationalities: ["Korea, Republic of"] });

    expect(chipLabels("Nationalities")).toEqual([
      expect.stringContaining("Korea, Republic of"),
      expect.stringContaining("Germany"),
    ]);
  });

  it("leaves the rest of a facet in the order the server sent it", () => {
    renderSidebar({ selectedHobbies: ["board games"] });

    expect(chipLabels("Hobbies")).toEqual([
      expect.stringContaining("board games"),
      expect.stringContaining("hiking"),
      expect.stringContaining("chess"),
    ]);
  });

  it("represents a selection as the chip and nothing else", () => {
    /* There is no separate active-filters region to reconcile: the facet arrays
       always carry every selected value, so one chip is the whole of it. */
    renderSidebar({ selectedHobbies: ["chess"], selectedNationalities: ["Germany"] });

    expect(screen.getAllByRole("button", { name: /chess/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Germany/ })).toHaveLength(1);
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
