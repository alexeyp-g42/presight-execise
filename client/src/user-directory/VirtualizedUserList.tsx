import type { User } from "@presight/shared";
import { useRef } from "react";
import { UserCardSkeleton } from "./UserCardSkeleton";
import { UserDirectoryCard } from "./UserDirectoryCard";
import { useUserRowHeight } from "./useUserRowHeight";
import { useVirtualUserRows } from "./useVirtualUserRows";

/* One continuous list over every page fetched so far. The scroll container is
   this element and only this element, at every breakpoint — so the virtualizer
   has exactly one answer to "which element scrolls?" and there is a single code
   path rather than one per layout. */

type VirtualizedUserListProps = {
  users: User[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export const VirtualizedUserList = ({
  users,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: VirtualizedUserListProps) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const rowHeight = useUserRowHeight();

  const { virtualRows, totalSize } = useVirtualUserRows({
    userCount: users.length,
    hasNextPage,
    isFetchingNextPage,
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
          /* Past the last user is the `+1` row: the skeleton, in the list
             rather than bolted below it. */
          const isSkeletonRow = virtualRow.index >= users.length;
          const user = users[virtualRow.index];

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
              {isSkeletonRow || !user ? <UserCardSkeleton /> : <UserDirectoryCard user={user} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
