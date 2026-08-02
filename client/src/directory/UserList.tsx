import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DirectoryParams } from '../state/directoryParams';
import { useUsersInfinite } from '../api/queries';
import { UserCard } from './UserCard';
import { CardSkeleton, EmptyState, ErrorState, ListSkeleton } from './states';

/** Card height plus the gap. `measureElement` corrects any drift. */
const ESTIMATED_ROW_HEIGHT = 108;

interface Props {
  params: DirectoryParams;
  onClear: () => void;
}

export function UserList({ params, onClear }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, error, isPending, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useUsersInfinite(params);

  const users = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.page_info.total ?? 0;

  // One extra row while more pages exist. It renders the loading card and, by
  // entering the overscan window, is what triggers the next fetch.
  const rowCount = hasNextPage ? users.length + 1 : users.length;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const last = virtualItems.at(-1);
    if (!last) return;
    if (last.index >= users.length - 1 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [virtualItems, users.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // `isPending`, not `isFetching`: with keepPreviousData the latter is true on
  // every keystroke, and gating on it would replace the visible list with
  // skeletons while someone is still typing.
  if (isPending) {
    return (
      <div className="px-4 pb-4 sm:px-6">
        <ListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pb-4 sm:px-6">
        <ErrorState
          title="Couldn't load people"
          message={error instanceof Error ? error.message : 'The request failed.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="px-4 pb-4 sm:px-6">
        <EmptyState onClear={onClear} />
      </div>
    );
  }

  return (
    <>
      <p className="px-4 pb-3 text-sm text-muted sm:px-6" aria-live="polite">
        <span className="num text-ink">{total.toLocaleString()}</span>{' '}
        {total === 1 ? 'person' : 'people'}
      </p>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualItems.map((item) => {
            const user = users[item.index];
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <div className="pb-2">
                  {user ? (
                    <UserCard user={user} selectedHobbies={params.hobbies} />
                  ) : (
                    <CardSkeleton />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
