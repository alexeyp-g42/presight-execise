import { act, renderHook, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { useDirectorySelection } from "./useDirectorySelection";

/* nuqs' own parsing is vendor code and is not re-tested. What is tested here is
   the wiring this repo chose: that a selection travels as **repeated keys** in
   exactly the shape the API accepts, that a toggle is a toggle in both
   directions, and that each one pushes a history entry so back undoes that one
   selection. The repeated-key shape is the whole reason the shared URL and the
   request are the same string — a comma-joined parser would have split "Korea,
   Republic of" into two selections matching nothing. */

const renderSelection = (searchParams: string) => {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const view = renderHook(() => useDirectorySelection(), {
    wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate }),
  });

  return { ...view, onUrlUpdate };
};

/* Statement bodies, not expressions: a nuqs setter returns a promise, and an
   expression-bodied arrow silently switches `act` to async mode — see the note
   in `useSharedUrl.test.tsx` for what that costs the *next* test. */

describe("useDirectorySelection", () => {
  it("reads no selection at all from a bare URL", () => {
    const { result } = renderSelection("");

    expect(result.current.hobbies).toEqual([]);
    expect(result.current.nationalities).toEqual([]);
  });

  it("reads a pasted selection off repeated keys", () => {
    const { result } = renderSelection("?hobbies=chess&hobbies=judo&nationalities=Germany");

    expect(result.current.hobbies).toEqual(["chess", "judo"]);
    expect(result.current.nationalities).toEqual(["Germany"]);
  });

  it("carries a value containing a comma through as one selection", () => {
    const { result } = renderSelection("?nationalities=Korea%2C+Republic+of&nationalities=Germany");

    expect(result.current.nationalities).toEqual(["Korea, Republic of", "Germany"]);
  });

  it("adds a value the viewer has not selected yet", async () => {
    const { result, onUrlUpdate } = renderSelection("?hobbies=chess");

    act(() => {
      result.current.toggleHobby("judo");
    });

    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?hobbies=chess&hobbies=judo"),
    );
  });

  it("removes a value the viewer has already selected", async () => {
    const { result, onUrlUpdate } = renderSelection("?hobbies=chess&hobbies=judo");

    act(() => {
      result.current.toggleHobby("chess");
    });

    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?hobbies=judo"));
  });

  it("drops the key rather than leaving an empty one behind", async () => {
    const { result, onUrlUpdate } = renderSelection("?hobbies=chess");

    act(() => {
      result.current.toggleHobby("chess");
    });

    /* `?hobbies=` would be a selection of the empty string rather than no
       selection at all, and the URL is supposed to *be* the view. */
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(""));
  });

  it("pushes a history entry per toggle, so back undoes exactly one selection", async () => {
    const { result, onUrlUpdate } = renderSelection("");

    act(() => {
      result.current.toggleNationality("Germany");
    });

    /* Discrete deliberate acts, like the sort controls — and back lands on a
       query key already in the cache, so it repaints without a request. */
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe("push"));
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?nationalities=Germany");
  });

  it("leaves the other dimension alone", async () => {
    const { result, onUrlUpdate } = renderSelection("?hobbies=chess");

    act(() => {
      result.current.toggleNationality("Germany");
    });

    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?hobbies=chess&nationalities=Germany"),
    );
  });
});
