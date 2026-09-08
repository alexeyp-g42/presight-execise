import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchUsers } from '../api/client'
import type { FilterState, User } from '../api/types'

export function useUsers(state: FilterState) {
  const query = useInfiniteQuery({
    queryKey: ['users', state],
    queryFn: ({ pageParam, signal }) => fetchUsers(state, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor,
  })

  const users = useMemo<User[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )

  return { ...query, users }
}
