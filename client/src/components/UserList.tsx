import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'
import type { useUsers } from '../hooks/useUsers'
import { StatusPanel } from './StatusPanel'
import { UserCard } from './UserCard'

const ROW_HEIGHT = 108
const LOAD_AHEAD = 5

interface UserListProps {
  query: ReturnType<typeof useUsers>
  onClearFilters: () => void
}

export function UserList({ query, onClearFilters }: UserListProps) {
  const { users, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    query
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const lastVisibleIndex = virtualItems.at(-1)?.index ?? 0

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && lastVisibleIndex >= users.length - LOAD_AHEAD) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, lastVisibleIndex, users.length, fetchNextPage])

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4">
        <StatusPanel
          variant="error"
          message={error instanceof Error ? error.message : 'Could not load users'}
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="p-4">
        <StatusPanel
          variant="empty"
          message="No users match these filters"
          actionLabel="Clear all filters"
          onAction={onClearFilters}
        />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-4 pb-4">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((item) => (
          <div
            key={users[item.index].id}
            data-index={item.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full pb-2"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            <UserCard user={users[item.index]} />
          </div>
        ))}
      </div>
      {isFetchingNextPage && (
        <p className="py-3 text-center text-sm text-slate-400">Loading more…</p>
      )}
    </div>
  )
}
