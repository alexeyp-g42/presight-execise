import type { FacetsResponse } from "@presight/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchFacets, type UserFilter } from "../api/userDirectoryApi";

/* The sidebar's server state: a plain query, not an infinite one, because
   facets have no pages — one request describes the whole result set.

   Its key is the **filters only**, where the list's is filters *and* sort. That
   is the whole coordination between the two: changing the sort changes the
   list's key and not this one, so the viewer's selections and their counts
   visibly stay put while the order changes, and no code anywhere had to arrange
   it. The endpoint split is the same decision one layer down — facets are page-
   and sort-independent, so bundling them onto the list would re-run two
   aggregates on every infinite-scroll fetch. */

/* Built from the three filter fields by name rather than by spreading whatever
   was handed in, so the invariant holds structurally: a `UserDirectoryView`
   passed here by mistake still keys on its filter half, and `sort` cannot leak
   into the sidebar's cache key. */
export const facetCountsQueryKey = ({ q, hobbies, nationalities }: UserFilter) =>
  ["facets", { q, hobbies, nationalities }] as const;

export type FacetCountsResult = {
  /** The response, rendered straight through. `undefined` before the first one lands. */
  facets: FacetsResponse | undefined;
};

export const useFacetCounts = (filter: UserFilter): FacetCountsResult => {
  const { data } = useQuery({
    queryKey: facetCountsQueryKey(filter),
    queryFn: ({ signal }) => fetchFacets(filter, signal),
    /* The previous response stays on screen while the next one is in flight,
       which is not a polish detail here: without it every chip — the selected
       ones included — unmounts for the length of a request the viewer started
       by pressing one of them. A selection has to stay deselectable, so it has
       to stay on screen. Counts lag by one request and then correct. */
    placeholderData: keepPreviousData,
  });

  /* Nothing about failure yet — the sidebar's error state belongs with the
     list's, in #27. */
  return { facets: data };
};
