import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/Button";
import { StatusMessage } from "@/components/StatusMessage";
import { UserCard, UserCardSkeleton } from "@/components/UserCard";
import { useColumnCount } from "@/hooks/useColumnCount";
import { useUsers } from "@/hooks/useDirectoryData";
import type { DirectoryState } from "@/types/user";
import styles from "./UserList.module.scss";

const ROW_HEIGHT = 136;
const PREFETCH_ROWS = 5;
const SKELETON_COUNT = 9;

interface UserListProps {
  state: DirectoryState;
  resetKey: string;
  onClearFilters: () => void;
}

const numberFormat = new Intl.NumberFormat();

export const UserList = ({ state, resetKey, onClearFilters }: UserListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useColumnCount(scrollRef);
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useUsers(state);

  const users = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const rowCount = Math.ceil(users.length / columns);
  const showFooter = hasNextPage || isFetchNextPageError;

  const virtualizer = useVirtualizer({
    count: showFooter ? rowCount + 1 : rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const lastVisibleRow = virtualRows.at(-1)?.index ?? -1;

  useEffect(() => {
    if (
      lastVisibleRow >= rowCount - PREFETCH_ROWS &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError
    ) {
      fetchNextPage();
    }
  }, [lastVisibleRow, rowCount, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [resetKey, virtualizer]);

  const renderBody = () => {
    if (isPending) {
      return (
        <div className={styles.skeletonGrid} aria-busy="true" aria-label="Loading people">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <UserCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (isError && users.length === 0) {
      return (
        <StatusMessage
          icon="⚠️"
          tone="error"
          title="Couldn't load people"
          description={error.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      );
    }

    if (users.length === 0) {
      return (
        <StatusMessage
          icon="🔍"
          title="Nobody here… yet"
          description="No one matches this search. Try a different name or loosen the filters."
          action={
            <Button variant="primary" onClick={onClearFilters}>
              Clear search and filters
            </Button>
          }
        />
      );
    }

    return (
      <div className={styles.inner} style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.map((row) => {
          const style: CSSProperties = {
            height: row.size,
            transform: `translateY(${row.start}px)`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          };

          if (row.index >= rowCount) {
            return (
              <div key="footer" className={styles.footer} style={style}>
                {isFetchNextPageError ? (
                  <Button onClick={() => fetchNextPage()}>Couldn't load more. Retry</Button>
                ) : (
                  <span className={styles.spinner} role="status" aria-label="Loading more people" />
                )}
              </div>
            );
          }

          const rowUsers = users.slice(row.index * columns, (row.index + 1) * columns);
          return (
            <div key={row.key} className={styles.row} style={style}>
              {rowUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className={styles.container} aria-label="People">
      <p className={styles.summary} aria-live="polite">
        {isPending ? (
          "Finding people…"
        ) : (
          <>
            <strong>{numberFormat.format(total)}</strong> {total === 1 ? "person" : "people"}
          </>
        )}
      </p>
      <div ref={scrollRef} className={styles.scroller}>
        {renderBody()}
      </div>
    </section>
  );
};
