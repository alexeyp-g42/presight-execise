import type { FacetsResponse } from "@presight/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserFilter } from "../api/userDirectoryApi";
import { facetCountsQueryKey, useFacetCounts } from "./useFacetCounts";

/* Client seam 3: the single typed API module, faked. One seam and no extra
   deps — the wire format is already pinned by the server suite, so what is
   worth asserting here is only what the client decides, and the whole of that
   is the cache key.

   The property this file exists for: the facets key is the **filters**, and
   nothing else. It is what makes changing the sort refetch the list and leave
   the sidebar untouched — with no coordination between the two queries beyond
   their keys being different shapes. Nothing else in the client would fail if
   it broke; the sidebar would just quietly refetch and repaint on every sort
   change, which reads as slowness rather than as a bug. */

const { fetchFacets } = vi.hoisted(() => ({ fetchFacets: vi.fn() }));

vi.mock("../api/userDirectoryApi", () => ({ fetchFacets }));

const facets: FacetsResponse = {
  total: 1234,
  hobbies: [{ value: "chess", count: 88 }],
  nationalities: [{ value: "Germany", count: 500 }],
};

const noSelection: UserFilter = { q: "", hobbies: [], nationalities: [] };

const renderFacetCounts = (filter: UserFilter) => {
  /* Retries off and no cache shared between tests: a failing query would
     otherwise sit in a backoff for the length of the run. */
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(({ view }: { view: UserFilter }) => useFacetCounts(view), {
    wrapper,
    initialProps: { view: filter },
  });
};

beforeEach(() => {
  fetchFacets.mockReset();
  fetchFacets.mockResolvedValue(facets);
});

describe("useFacetCounts", () => {
  it("asks the API module for the filter it was handed", async () => {
    const filter: UserFilter = { q: "müller", hobbies: ["chess"], nationalities: ["Germany"] };
    const { result } = renderFacetCounts(filter);

    await waitFor(() => expect(result.current.facets).toEqual(facets));
    expect(fetchFacets).toHaveBeenCalledOnce();
    expect(fetchFacets.mock.calls[0][0]).toEqual(filter);
  });

  it("refetches when a selection changes", async () => {
    const { rerender } = renderFacetCounts(noSelection);

    await waitFor(() => expect(fetchFacets).toHaveBeenCalledOnce());

    rerender({ view: { ...noSelection, hobbies: ["chess"] } });

    await waitFor(() => expect(fetchFacets).toHaveBeenCalledTimes(2));
  });

  it("does not refetch when the filter is rebuilt unchanged", async () => {
    /* The page builds a fresh filter object every render, so the key has to
       hash by value rather than by identity — otherwise every keystroke
       elsewhere on the page would refetch the whole sidebar. */
    const { rerender } = renderFacetCounts(noSelection);

    await waitFor(() => expect(fetchFacets).toHaveBeenCalledOnce());

    rerender({ view: { ...noSelection } });

    expect(fetchFacets).toHaveBeenCalledOnce();
  });
});

describe("facet counts query key", () => {
  it("keys on the filter and nothing else", () => {
    expect(facetCountsQueryKey({ q: "müller", hobbies: ["chess"], nationalities: ["Germany"] })).toEqual([
      "facets",
      { q: "müller", hobbies: ["chess"], nationalities: ["Germany"] },
    ]);
  });

  it("cannot be keyed on the sort, even handed a whole directory view", () => {
    /* The structural half of "changing the sort leaves the sidebar untouched":
       the key is built from the three filter fields *by name*, so a view that
       carries `sort` and `dir` — which is what the list query is keyed on —
       still produces the same key as the filter alone. A spread here instead
       would compile, and would refetch the sidebar on every sort change. */
    const view = { ...noSelection, hobbies: ["chess"], sort: "age", dir: "desc" };

    expect(facetCountsQueryKey(view)).toEqual(
      facetCountsQueryKey({ ...noSelection, hobbies: ["chess"] }),
    );
    expect(JSON.stringify(facetCountsQueryKey(view))).not.toContain("age");
  });
});
