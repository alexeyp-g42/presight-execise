import type { User } from "@presight/shared";
import { useRef } from "react";
import { NextPageErrorRow } from "./NextPageErrorRow";
import { UserCardSkeleton } from "./UserCardSkeleton";
import { UserDirectoryCard } from "./UserDirectoryCard";
import { useUserRowHeight } from "./useUserRowHeight";
import { useVirtualUserRows } from "./useVirtualUserRows";

/* One continuous list over every page fetched so far. The scroll container is
   this element and only this element, at every breakpoint — so the virtualizer
   has exactly one answer to "which element scrolls?" and there is a single code
   path rather than one per layout.

   Every state the list can be in is a *row* here rather than a screen wrapped
   around it: the first load's skeletons, the one that trails a page in flight,
   and the retry that replaces it when that page fails. They are all the card's
   box at the card's pitch, so none of them can shift anything — and the two
   states that genuinely have no list to show, an empty result set and a failed
   first page, are the two the page swaps this component out for entirely. */

type VirtualizedUserListProps = {
  users: User[];
  /** Nothing has landed yet — the rows are skeletons, and there is nothing to index. */
  isFirstLoad: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** The next page failed. The trailing row becomes the way to ask again. */
  isNextPageError: boolean;
  /** Asks for the next page — and, from the trailing row's control, asks again. */
  fetchNextPage: () => void;
};

export const VirtualizedUserList = ({
  users,
  isFirstLoad,
  hasNextPage,
  isFetchingNextPage,
  isNextPageError,
  fetchNextPage,
}: VirtualizedUserListProps) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const rowHeight = useUserRowHeight();

  const { virtualRows, totalSize } = useVirtualUserRows({
    userCount: users.length,
    isFirstLoad,
    hasNextPage,
    isFetchingNextPage,
    isNextPageError,
    fetchNextPage,
    scrollElementRef,
    rowHeight,
  });

  return (
    <div
      ref={scrollElementRef}
      /* `contain: strict` is the vendor's own recommendation for a scroll
         container it positions absolutely inside: it keeps layout and paint
         from escaping the pane as rows are swapped in and out. */
      style={{ contain: "strict" }}
      className="h-full overflow-y-auto overscroll-contain px-3 sm:px-4"
    >
      {/* The full scroll height on the first frame, because every row's size is
          known rather than measured — this is what stops the scrollbar drifting
          as pages land. */}
      <div style={{ height: totalSize }} className="relative w-full">
        {virtualRows.map((virtualRow) => {
          /* Past the last user is a row with no user behind it: the `+1` while a
             page is in flight, or every row on the first load, when there are no
             users at all. Either way it is in the list rather than bolted below
             it. */
          const isTrailingRow = virtualRow.index >= users.length;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              /* The height comes from the virtualizer rather than from a
                 constant repeated here, so the row is exactly as tall as the
                 total scroll height says it is — by construction, not by two
                 numbers agreeing. The padding is the gutter between cards; the
                 card inside is `h-full`. */
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="absolute top-0 left-0 w-full pb-2"
            >
              {isTrailingRow ? (
                isNextPageError ? (
                  <NextPageErrorRow onRetry={fetchNextPage} />
                ) : (
                  <UserCardSkeleton />
                )
              ) : (
                <UserDirectoryCard user={users[virtualRow.index]} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
