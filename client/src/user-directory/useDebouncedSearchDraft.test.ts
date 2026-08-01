import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedSearchDraft } from "./useDebouncedSearchDraft";

/* The client's one timer, tested for what it guarantees rather than for how
   long it waits: the 300ms itself is not asserted anywhere — `runAllTimers`
   stands in for "the viewer paused" — so tuning the delay never edits a test.

   What is asserted is the pair of invariants the draft exists for: keystrokes
   paint without waiting, and the URL stays the thing that describes the
   screen — a commit collapses to one, an external URL change wins over a
   draft in flight, and the hook's own commit coming back through the URL does
   not reset what the viewer has typed since. */

const renderDraft = (searchText: string) => {
  const onSearchTextChange = vi.fn();
  const view = renderHook(
    (props: { searchText: string }) =>
      useDebouncedSearchDraft({ searchText: props.searchText, onSearchTextChange }),
    { initialProps: { searchText } },
  );

  return { ...view, onSearchTextChange };
};

describe("useDebouncedSearchDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts from the search text already in the URL", () => {
    const { result } = renderDraft("smith");

    expect(result.current.draft).toBe("smith");
  });

  it("paints every keystroke into the draft while committing none of them", () => {
    const { result, onSearchTextChange } = renderDraft("");

    for (const keystroke of ["s", "sm", "smi"]) {
      act(() => result.current.updateDraft(keystroke));
      expect(result.current.draft).toBe(keystroke);
    }

    expect(onSearchTextChange).not.toHaveBeenCalled();
  });

  it("commits the latest draft once the viewer pauses, and only once", () => {
    const { result, onSearchTextChange } = renderDraft("");

    act(() => result.current.updateDraft("s"));
    act(() => result.current.updateDraft("sm"));
    act(() => result.current.updateDraft("smi"));
    act(() => vi.runAllTimers());

    expect(onSearchTextChange).toHaveBeenCalledExactlyOnceWith("smi");
  });

  it("commits a cleared search box, rather than treating blank as nothing to say", () => {
    const { result, onSearchTextChange } = renderDraft("smith");

    act(() => result.current.updateDraft(""));
    act(() => vi.runAllTimers());

    expect(onSearchTextChange).toHaveBeenCalledExactlyOnceWith("");
  });

  it("adopts a search text that changed underneath it, as the back button does", () => {
    const { result, rerender } = renderDraft("smith");

    rerender({ searchText: "jones" });

    expect(result.current.draft).toBe("jones");
  });

  it("drops a pending commit when the URL changes underneath it", () => {
    const { result, rerender, onSearchTextChange } = renderDraft("");

    act(() => result.current.updateDraft("smi"));
    rerender({ searchText: "jones" });
    act(() => vi.runAllTimers());

    /* Without this the back button would land on `jones` and then be dragged
       back to `smi` by a timer the viewer had already navigated away from. */
    expect(onSearchTextChange).not.toHaveBeenCalled();
    expect(result.current.draft).toBe("jones");
  });

  it("leaves the draft alone when its own commit comes back through the URL", () => {
    const { result, rerender } = renderDraft("");

    act(() => result.current.updateDraft("smi"));
    act(() => vi.runAllTimers());
    /* The URL catching up with what this hook just committed. Typing carries
       on in the gap, and echoing the commit back must not undo it. */
    act(() => result.current.updateDraft("smith"));
    rerender({ searchText: "smi" });

    expect(result.current.draft).toBe("smith");
  });
});
