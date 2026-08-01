import { describe, expect, it } from "vitest";
import { shouldFetchNextPage } from "./useVirtualUserRows";

/* What survives of the infinite-scroll seam under jsdom. There is no sentinel
   element to observe and no layout to observe it with — every metric jsdom
   reports is zero — so the wiring (does the virtualizer render this row?) is
   not testable here without stubbing the measurement APIs and asserting the
   stubs. The decision it makes is, and it is the part with the failure modes:
   firing a second request while one is in flight, or firing forever at the
   bottom of a list with nothing left to fetch. */

/* A first page of 50 with more behind it: 50 user rows plus the skeleton row,
   so the last index is the skeleton at 50. */
const firstPageOfMany = {
  lastItemIndex: 50,
  rowCount: 51,
  hasNextPage: true,
  isFetchingNextPage: false,
};

describe("shouldFetchNextPage", () => {
  it("fires once the last row is rendered and another page exists", () => {
    expect(shouldFetchNextPage(firstPageOfMany)).toBe(true);
  });

  it("does not fire while the next page is already in flight", () => {
    /* The row stays rendered for the whole request, so this is asked again on
       every frame — without the guard, one scroll to the bottom fetches the
       same page repeatedly. */
    expect(
      shouldFetchNextPage({ ...firstPageOfMany, isFetchingNextPage: true }),
    ).toBe(false);
  });

  it("does not fire when there are no more pages", () => {
    /* The last page: no skeleton row, so the final index is the last user. */
    expect(
      shouldFetchNextPage({
        lastItemIndex: 49,
        rowCount: 50,
        hasNextPage: false,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
  });

  it("does not fire while the rendered window is short of the end", () => {
    expect(shouldFetchNextPage({ ...firstPageOfMany, lastItemIndex: 12 })).toBe(false);
  });

  it("does not fire before the virtualizer has rendered anything", () => {
    /* An empty window reports no last item, which arrives here as -1 — and on
       an empty list `rowCount - 1` is -1 too, so this is the one place the
       comparison alone would say yes. */
    expect(
      shouldFetchNextPage({
        lastItemIndex: -1,
        rowCount: 0,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
  });
});
