import type { SortDir, SortField, User } from "@presight/shared";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { fetchUserPage, USER_LIST_LIMIT, type UserFilter } from "../api/userDirectoryApi";

/* The directory's server state, and the reason there is no request-id guard
   anywhere in this client. A stale response cannot overwrite a fresh one
   because a changed filter is a *different* cache entry rather than a race, and
   cancellation is the `AbortSignal` the query function is handed. Both hazards
   are resolved by construction; neither is a rule anyone has to remember. */

/** Everything the list is keyed on: the filter, plus the order it is read in. */
export type UserDirectoryView = UserFilter & {
  sort: SortField;
  dir: SortDir;
};

/* Filter *and* sort, where the facets key is filter-only — so changing the sort
   refetches the list and leaves the sidebar alone, with no coordination between
   them beyond the two endpoints having different params. */
export const userDirectoryQueryKey = (view: UserDirectoryView) => ["users", view] as const;

export type UserDirectoryQueryResult = {
  /** Every page fetched so far, flattened — what the virtualizer indexes into. */
  users: User[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** Nothing has landed for this view yet, so the rows are skeletons standing in. */
  isFirstLoad: boolean;
  /** The rows on screen are the *previous* view's, held while this one is in flight. */
  isShowingPreviousView: boolean;
  /** The first page failed, so there are no rows to keep. */
  isFirstPageError: boolean;
  /** A later page failed. Every row fetched before it is still here. */
  isNextPageError: boolean;
  /** Re-runs the first page after it failed. */
  retryFirstPage: () => void;
};

export const useUserDirectoryQuery = (view: UserDirectoryView): UserDirectoryQueryResult => {
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending,
    isPlaceholderData,
    isError,
    isFetchNextPageError,
    refetch,
  } = useInfiniteQuery({
    queryKey: userDirectoryQueryKey(view),
    queryFn: ({ pageParam, signal }) =>
      fetchUserPage({ ...view, limit: USER_LIST_LIMIT, cursor: pageParam }, signal),
    /* `null` rather than an empty string — see the cursor note in the API module. */
    initialPageParam: null as string | null,
    /* `null` on the last page, which is exactly what the library reads as "no
       more pages" — so `has_more` never has to be consulted separately. */
    getNextPageParam: (lastPage) => lastPage.page_info.next_cursor,
    /* What makes a filter change *dim* the list rather than blank it. A changed
       filter is a different cache entry with no data of its own, so without this
       every chip press empties the pane for the length of a request and the
       viewer loses their place — which is the same reason the sidebar keeps its
       chips across one.
     *
     * It also settles the pair of numbers in "Showing 50 of 1,234": both queries
     * now hold their previous answer, so the readout goes from one consistent
     * pair to the next instead of passing through "Showing 0 of 1,234".
     *
     * Note the library only substitutes it while the query is *pending* — a
     * failure drops it, which is exactly the split below: rows kept means an
     * inline retry, no rows means the centred one. */
    placeholderData: keepPreviousData,
  });

  /* Memoised because a fresh array every render would restart the virtualizer's
     effects on every scroll frame. */
  const users = useMemo(() => data?.pages.flatMap((page) => page.users) ?? [], [data]);

  /* Both wrapped rather than handed out raw: each takes an options object, and
     passed straight to `onClick` a retry control would call it with a React
     event. */
  const loadNextPage = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const retryFirstPage = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    users,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: loadNextPage,
    isFirstLoad: isPending,
    isShowingPreviousView: isPlaceholderData,
    /* The whole of the client's error handling, and it splits on **whether rows
       already exist** rather than on which error it was. Of the five codes in
       the envelope only `INTERNAL` is reachable from here — nuqs parses the sort
       against the contract's arrays before a request exists, cursors are never
       user-authored, the client calls two endpoints, and a selection matching
       nothing is a `200` — so the question the viewer needs answered is not
       *what* failed but whether what they had is gone.
     *
     * The library draws the same line from the other side: only a next page can
     * be fetched "forward", and only a fetch forward can have rows behind it. So
     * the two flags are exclusive by construction, and the case they leave out
     * is deliberate — a background refetch failing with rows on screen reports
     * nothing and keeps them, because nothing was lost and the rows are still
     * the last true answer the server gave. */
    isFirstPageError: isError && users.length === 0,
    isNextPageError: isFetchNextPageError,
    retryFirstPage,
  };
};
