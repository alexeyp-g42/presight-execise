import { DEFAULT_DIR, DEFAULT_SORT } from "@presight/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { useSharedUrl } from "./useSharedUrl";

/* nuqs' own parsing is vendor code and is not re-tested. What *is* tested here
   is the wiring this repo chose and could get wrong on its own: which arrays
   the parsers read against, which defaults they fall back to, and which of the
   three keys pushes a history entry rather than replacing one. Both are
   promises `CONTEXT.md` now makes about the shared URL, and neither is pinned
   anywhere else. */

const renderSharedUrl = (searchParams: string) => {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const view = renderHook(() => useSharedUrl(), {
    wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate }),
  });

  return { ...view, onUrlUpdate };
};

/* Every `act` below takes a *statement* body on purpose. A nuqs setter returns
   a promise, so an expression-bodied arrow hands `act` a thenable, which
   silently switches it to async mode — and an async act nobody awaits leaves
   React's queue open, so the *next* test mounts a hook whose effects never run
   and reads `result.current` as null. The symptom lands a test away from the
   cause, which is exactly the kind of thing to write down. */

describe("useSharedUrl", () => {
  it("reads the whole directory in the contract's default order from a bare URL", () => {
    const { result } = renderSharedUrl("");

    expect(result.current).toMatchObject({
      searchText: "",
      sort: DEFAULT_SORT,
      dir: DEFAULT_DIR,
    });
  });

  it("reads a pasted view straight off the query string", () => {
    const { result } = renderSharedUrl("?q=m%C3%BCller&sort=age&dir=desc");

    expect(result.current).toMatchObject({ searchText: "müller", sort: "age", dir: "desc" });
  });

  it("falls back to the default order when the URL names a sort that does not exist", () => {
    /* The client-side half of the contract: `nickname` is not in `SORT_FIELDS`,
       so it never becomes a request the API would answer with a 400. */
    const { result } = renderSharedUrl("?q=smith&sort=nickname&dir=sideways");

    expect(result.current).toMatchObject({
      searchText: "smith",
      sort: DEFAULT_SORT,
      dir: DEFAULT_DIR,
    });
  });

  it("falls back on a query string truncated mid-value", () => {
    const { result } = renderSharedUrl("?sort=last_na");

    expect(result.current.sort).toBe(DEFAULT_SORT);
  });

  it("replaces the history entry when the search text changes", async () => {
    const { result, onUrlUpdate } = renderSharedUrl("");

    act(() => {
      result.current.setSearchText("smith");
    });

    /* Typing is continuous, so it must not flood the back button: a six-letter
       name leaves at most one entry rather than six. */
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe("replace"));
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?q=smith");
  });

  it("pushes a history entry when the sort field or direction changes", async () => {
    const { result, onUrlUpdate } = renderSharedUrl("");

    act(() => {
      result.current.setSort("age");
    });

    /* Discrete deliberate acts, so back undoes exactly that change — and lands
       on a query key already in the cache, which repaints without a request. */
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe("push"));
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?sort=age");

    act(() => {
      result.current.setDir("desc");
    });

    /* `?dir=desc` alone, with no `sort=age` beside it: the testing adapter holds
       the query string it was given rather than accumulating writes, so each
       update is read against the URL this test started from. */
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?dir=desc"));
    expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe("push");
  });

  it("drops a key from the URL rather than spelling out the default", async () => {
    const { result, onUrlUpdate } = renderSharedUrl("?sort=age");

    act(() => {
      result.current.setSort(DEFAULT_SORT);
    });

    /* A default the server already applies is noise in a link, and `?q=` would
       be a filter on the empty string rather than the whole directory. */
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(""));
  });
});
