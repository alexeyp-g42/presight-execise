import { useEffect, useRef } from 'react';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { UsersResponse, UserDTO } from '@shared/types';
import { UserCard } from './UserCard';

interface Props {
  query: UseInfiniteQueryResult<InfiniteData<UsersResponse>>;
}

const ROW_HEIGHT = 128;
const GAP = 12;

export function UserList({ query }: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const items: UserDTO[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 8,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const last = virtualRows[virtualRows.length - 1];

  useEffect(() => {
    if (!last) return;
    if (last.index >= items.length - 5 && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [last, items.length, query]);

  return (
    <div ref={parentRef} className="flex-1 overflow-auto p-4" data-testid="user-list">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((vr) => {
          const user = items[vr.index]!;
          return (
            <div
              key={user.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${vr.start}px)`,
                height: ROW_HEIGHT,
              }}
            >
              <UserCard user={user} />
            </div>
          );
        })}
      </div>
      {query.isFetchingNextPage && (
        <div className="text-center text-sm text-gray-500 py-2">Loading more…</div>
      )}
    </div>
  );
}
