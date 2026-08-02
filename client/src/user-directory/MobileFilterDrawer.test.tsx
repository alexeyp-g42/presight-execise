import type { FacetsResponse } from "@presight/shared";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileFilterDrawer, type MobileFilterDrawerProps } from "./MobileFilterDrawer";

/* The half of the drawer that is not layout.

   Which is most of it: the badge is arithmetic over the selection, the chips
   are `FacetSelectionControls` reached a second way, and the open state is a
   `<dialog>` this component drives. jsdom hides a `dialog` without an `open`
   attribute the way a browser does, so "the facets are behind the button" is a
   real assertion here rather than a class name.

   What is *not* asserted is what the browser owns and jsdom has no top layer
   for: the focus trap, focus restore, `::backdrop`, and Escape. Those are the
   reason this is a real `<dialog>` instead of a `div` wearing `role="dialog"`,
   and they are verified by hand — see `client/vitest.setup.ts`, which stubs
   only the three members jsdom is missing and fakes none of them. The one that
   *is* covered is the wiring underneath Escape: a dialog closed from outside
   React must put that back into state, or the drawer never reopens. */

const facets: FacetsResponse = {
  total: 1234,
  hobbies: [{ value: "chess", count: 88 }],
  nationalities: [{ value: "Korea, Republic of", count: 12 }],
};

const renderDrawer = (overrides: Partial<MobileFilterDrawerProps> = {}) => {
  const onToggleHobby = vi.fn();
  const onToggleNationality = vi.fn();

  render(
    <MobileFilterDrawer
      facets={facets}
      selectedHobbies={[]}
      selectedNationalities={[]}
      onToggleHobby={onToggleHobby}
      onToggleNationality={onToggleNationality}
      {...overrides}
    />,
  );

  return { onToggleHobby, onToggleNationality };
};

const filtersButton = (): HTMLElement => screen.getByRole("button", { name: /^Filters/ });

const openDrawer = () => fireEvent.click(filtersButton());

/* Lets one test widen the window past `lg`. The drawer's lifetime is state, not
   cascade — the panel has to *close*, which jsdom can answer — so it is asserted
   rather than left to the hand pass with the layout. `useViewportMatch` has its
   own suite; this is the drawer honouring it. */
const realMatchMedia = window.matchMedia;

const widenPastSidebarBreakpoint = () => {
  const listeners = new Set<() => void>();
  let matches = false;

  window.matchMedia = ((query: string) =>
    ({
      media: query,
      get matches() {
        return matches;
      },
      onchange: null,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

  return () =>
    act(() => {
      matches = true;
      listeners.forEach((notify) => notify());
    });
};

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe("MobileFilterDrawer", () => {
  it("keeps both facets behind the button until it is pressed", () => {
    renderDrawer();

    expect(screen.queryByRole("region", { name: "Hobbies" })).not.toBeInTheDocument();

    openDrawer();

    expect(screen.getByRole("region", { name: "Hobbies" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nationalities" })).toBeInTheDocument();
  });

  it("carries no badge while nothing is selected", () => {
    renderDrawer();

    /* An exact name rather than a regex: a badge would be part of it, so the
       name being "Filters" and nothing else is the assertion. */
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("counts every selection across both facets in the badge", () => {
    renderDrawer({
      selectedHobbies: ["chess", "hiking"],
      selectedNationalities: ["Korea, Republic of"],
    });

    expect(filtersButton()).toHaveTextContent("3");
    /* In the name, not only in the paint: a bare number beside the word reads
       as a third filter rather than as three of them. */
    expect(filtersButton()).toHaveAccessibleName("Filters, 3 selected");
  });

  it("moves the badge as selections change", () => {
    const { rerender } = render(
      <MobileFilterDrawer
        facets={facets}
        selectedHobbies={["chess"]}
        selectedNationalities={[]}
        onToggleHobby={vi.fn()}
        onToggleNationality={vi.fn()}
      />,
    );

    expect(filtersButton()).toHaveTextContent("1");

    rerender(
      <MobileFilterDrawer
        facets={facets}
        selectedHobbies={["chess"]}
        selectedNationalities={["Germany"]}
        onToggleHobby={vi.fn()}
        onToggleNationality={vi.fn()}
      />,
    );

    expect(filtersButton()).toHaveTextContent("2");
  });

  it("reports a chip pressed inside the drawer to the right handler", () => {
    const { onToggleHobby, onToggleNationality } = renderDrawer();

    openDrawer();
    fireEvent.click(screen.getByRole("button", { name: /chess/ }));

    expect(onToggleHobby).toHaveBeenCalledExactlyOnceWith("chess");
    expect(onToggleNationality).not.toHaveBeenCalled();
  });

  it("keeps a chip's selected state readable inside the drawer", () => {
    renderDrawer({ selectedHobbies: ["chess"] });

    openDrawer();

    expect(screen.getByRole("button", { name: /chess/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("leaves the drawer open while the viewer toggles a chip", () => {
    /* A selection re-fetches both queries, and closing on every press would
       make picking two hobbies two round trips through the button. */
    renderDrawer();

    openDrawer();
    fireEvent.click(screen.getByRole("button", { name: /chess/ }));

    expect(screen.getByRole("region", { name: "Hobbies" })).toBeInTheDocument();
  });

  it("closes on the drawer's own close button", () => {
    renderDrawer();

    openDrawer();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.queryByRole("region", { name: "Hobbies" })).not.toBeInTheDocument();
  });

  it("reopens after the dialog is closed from outside React", () => {
    /* What Escape and a backdrop press both come through as. Without the
       `close` event putting the dialog's state back, React still believes the
       drawer is open, pressing Filters changes nothing, and the viewer is left
       with a button that has stopped working. */
    renderDrawer();
    openDrawer();

    const drawer = screen.getByRole("dialog");
    fireEvent(drawer, new Event("close"));

    expect(screen.queryByRole("region", { name: "Hobbies" })).not.toBeInTheDocument();

    openDrawer();

    expect(screen.getByRole("region", { name: "Hobbies" })).toBeInTheDocument();
  });

  it("closes itself when the viewport widens to where the sidebar takes over", () => {
    /* A modal must not outlive the button that opened it: past `lg` the trigger
       is out of the layout and the sidebar carries the same controls, so a
       drawer left open is a panel with no way back to it and a second copy of
       every chip. */
    const widen = widenPastSidebarBreakpoint();
    renderDrawer();
    openDrawer();

    expect(screen.getByRole("region", { name: "Hobbies" })).toBeInTheDocument();

    widen();

    expect(screen.queryByRole("region", { name: "Hobbies" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

  it("names the drawer by its own heading", () => {
    renderDrawer();

    openDrawer();

    const drawer = screen.getByRole("dialog", { name: "Filters" });

    expect(within(drawer).getByRole("heading", { name: "Filters" })).toBeInTheDocument();
  });

  it("holds the button while the first facet response is still in flight", () => {
    /* The badge is arithmetic over the URL's selection, so it is right before
       any response lands — and a button that appears late is a button the
       viewer has already learned is not there. */
    renderDrawer({ facets: undefined, selectedHobbies: ["chess"] });

    expect(filtersButton()).toHaveTextContent("1");

    openDrawer();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Hobbies" })).not.toBeInTheDocument();
  });
});
