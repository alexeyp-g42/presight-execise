import { useMemo } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@mantine/hooks'
import { LayoutList } from 'lucide-react'
import { fetchHobbies, fetchNationalities, fetchUsers, nextPageOffset } from './api/users-api'
import { type FacetOption, toHobbyOption, toNationalityOption, type UserFilters } from './api/types'
import { useShallow } from 'zustand/react/shallow'
import { selectFilters, useFiltersStore, useFiltersUrlSync } from './store/filters-store'
import { TextFilter } from './components/text-filter/text-filter'
import { SortControls } from './components/sort-controls/sort-controls'
import { FacetCombobox } from './components/facet-combobox/facet-combobox'
import { FilterChips } from './components/filter-chips/filter-chips'
import { FacetPanel } from './components/facet-panel/facet-panel'
import { UserList } from './components/user-list/user-list'
import styles from './app.module.scss'

const STALE_TIME = {
    /** Hobbies and nationalities are fixed reference lists — refetching them is near-pointless. */
    reference: 10 * 60 * 1000,
    /** Results can change under the filters, so keep them fresh on a much shorter leash. */
    users: 60 * 1000,
} as const

export function App() {
    useFiltersUrlSync()

    const hobbiesQuery = useQuery({
        queryKey: ['hobbies'],
        queryFn: fetchHobbies,
        staleTime: STALE_TIME.reference,
    })
    const nationalitiesQuery = useQuery({
        queryKey: ['nationalities'],
        queryFn: fetchNationalities,
        staleTime: STALE_TIME.reference,
    })

    const hobbyOptions: FacetOption[] = useMemo(() => (hobbiesQuery.data ?? []).map(toHobbyOption), [hobbiesQuery.data])
    const nationalityOptions: FacetOption[] = useMemo(
        () => (nationalitiesQuery.data ?? []).map(toNationalityOption),
        [nationalitiesQuery.data],
    )

    // Composite selector, so useShallow is required: without it this object would be a new
    // reference on every store write and re-render forever.
    const filters = useFiltersStore(useShallow(selectFilters))

    // The API filters on a name prefix, so refetching on every keystroke would fire a request per
    // character. Debounce the value that reaches the query key, not the value in the input.
    const [debouncedSearch] = useDebouncedValue(filters.search, 300)
    const query = useMemo<UserFilters>(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch])

    const usersQuery = useInfiniteQuery({
        queryKey: ['users', query],
        queryFn: ({ pageParam }) => fetchUsers(query, pageParam),
        initialPageParam: 0,
        getNextPageParam: nextPageOffset,
        staleTime: STALE_TIME.users,
        // Every filter or sort change is a new query key with an empty cache. Without this the list
        // and both facet panels would blank out to skeletons on each change; instead the previous
        // results stay on screen (dimmed) until the new ones land.
        placeholderData: keepPreviousData,
    })

    const users = useMemo(() => usersQuery.data?.pages.flatMap((p) => p.users) ?? [], [usersQuery.data])
    // Facets and the total describe the whole filtered set, so the first page is as good as any.
    const firstPage = usersQuery.data?.pages[0]

    return (
        <div className={styles.page}>
            {/* Block 1 — brand · text filter · sort */}
            <header className={styles.block1}>
                <div className={styles.brand}>
                    <LayoutList className={styles.logoIcon} size={22} strokeWidth={2.75} aria-hidden />
                    <span className={styles.logo}>LIST</span>
                    <div className={styles.title}>USER DIRECTORY</div>
                </div>
                <div className={styles.controls}>
                    <TextFilter />
                    <SortControls />
                </div>
            </header>

            {/* Block 2 — comboboxes · applied filters · result count */}
            <section className={styles.block2}>
                <div className={styles.filtersRow}>
                    <FacetCombobox
                        placeholder="HOBBY FILTER — TYPE TO SEARCH"
                        options={hobbyOptions}
                        facet="hobby"
                        accent="yellow"
                    />
                    <FacetCombobox
                        placeholder="NATIONALITY FILTER — TYPE TO SEARCH"
                        options={nationalityOptions}
                        facet="nationality"
                        accent="pink"
                    />
                    <FilterChips hobbyOptions={hobbyOptions} nationalityOptions={nationalityOptions} />
                </div>
                {/* On failure the list itself reports the error; a placeholder count only adds noise. */}
                {!usersQuery.isError && (
                    <div className={styles.count}>
                        {firstPage ? `${firstPage.pagination.total.toLocaleString()} USERS` : '— USERS'}
                    </div>
                )}
            </section>

            {/* Block 3 — facet panels (sticky sidebar on md+) · user list */}
            <section className={styles.block3}>
                <aside className={styles.sidebar}>
                    <FacetPanel title="TOP HOBBIES" facets={firstPage?.top_hobbies ?? []} facet="hobby" accent="pink" />
                    <FacetPanel
                        title="NATIONALITIES"
                        facets={firstPage?.top_nationalities ?? []}
                        facet="nationality"
                        accent="yellow"
                    />
                </aside>
                <main className={styles.list}>
                    <UserList
                        users={users}
                        total={firstPage?.pagination.total}
                        isLoading={usersQuery.isLoading}
                        isRefreshing={usersQuery.isPlaceholderData}
                        isError={usersQuery.isError}
                        isFetchingNextPage={usersQuery.isFetchingNextPage}
                        hasNextPage={usersQuery.hasNextPage}
                        onLoadMore={() => {
                            if (usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) usersQuery.fetchNextPage()
                        }}
                        onRetry={() =>
                            usersQuery.isLoading || users.length === 0
                                ? usersQuery.refetch()
                                : usersQuery.fetchNextPage()
                        }
                    />
                </main>
            </section>
        </div>
    )
}
