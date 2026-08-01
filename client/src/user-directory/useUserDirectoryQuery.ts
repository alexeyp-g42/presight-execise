import type { SortDir, SortField, User } from "@presight/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
};

export const useUserDirectoryQuery = (view: UserDirectoryView): UserDirectoryQueryResult => {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: userDirectoryQueryKey(view),
    queryFn: ({ pageParam, signal }) =>
      fetchUserPage({ ...view, limit: USER_LIST_LIMIT, cursor: pageParam }, signal),
    /* `null` rather than an empty string — see the cursor note in the API module. */
    initialPageParam: null as string | null,
    /* `null` on the last page, which is exactly what the library reads as "no
       more pages" — so `has_more` never has to be consulted separately. */
    getNextPageParam: (lastPage) => lastPage.page_info.next_cursor,
  });

  /* Memoised because a fresh array every render would restart the virtualizer's
     effects on every scroll frame. */
  const users = useMemo(() => data?.pages.flatMap((page) => page.users) ?? [], [data]);

  /* Deliberately nothing about failure yet: the first-page error state and the
     inline "couldn't load more" on the skeleton row are #27, and a `status` no
     caller reads would just be somewhere for that decision to hide. */
  return { users, hasNextPage, isFetchingNextPage, fetchNextPage };
};
