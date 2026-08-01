import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserSearchInput } from "./UserSearchInput";

/* Client seam 3 — a jsdom render with nothing faked, because the input is
   handed the committed search text and hands back the committed change. The
   URL boundary is the page's; what is asserted here is the half the viewer
   feels: the box paints what they type on the keystroke, and it shows the URL
   when the URL is what moved. Timing belongs to `useDebouncedSearchDraft`. */

describe("UserSearchInput", () => {
  it("shows the search text the view was loaded with", () => {
    render(<UserSearchInput searchText="müller" onSearchTextChange={vi.fn()} />);

    expect(screen.getByRole("searchbox", { name: /search/i })).toHaveValue("müller");
  });

  it("paints each keystroke without waiting for the search text to be committed", () => {
    const onSearchTextChange = vi.fn();

    render(<UserSearchInput searchText="" onSearchTextChange={onSearchTextChange} />);
    const searchBox = screen.getByRole("searchbox", { name: /search/i });

    for (const keystroke of ["v", "va", "van der"]) {
      fireEvent.change(searchBox, { target: { value: keystroke } });
      expect(searchBox).toHaveValue(keystroke);
    }

    expect(onSearchTextChange).not.toHaveBeenCalled();
  });

  it("shows a search text that changed underneath it, as the back button does", () => {
    const { rerender } = render(<UserSearchInput searchText="" onSearchTextChange={vi.fn()} />);

    rerender(<UserSearchInput searchText="jones" onSearchTextChange={vi.fn()} />);

    expect(screen.getByRole("searchbox", { name: /search/i })).toHaveValue("jones");
  });
});
