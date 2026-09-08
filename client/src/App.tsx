import { useCallback, useEffect, useRef, useState } from 'react'
import { ActiveFilters } from './components/ActiveFilters'
import { FacetSidebar } from './components/FacetSidebar'
import { SearchInput } from './components/SearchInput'
import { SortControls } from './components/SortControls'
import { UserList } from './components/UserList'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useFacets } from './hooks/useFacets'
import { useFilterState } from './hooks/useFilterState'
import { useUsers } from './hooks/useUsers'

export function App() {
  const filters = useFilterState()
  const [text, setText] = useState(filters.state.q)
  const debouncedText = useDebouncedValue(text, 300)
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const syncedText = useRef(filters.state.q)
  const drawerRef = useRef<HTMLDivElement>(null)
  const filtersButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const trimmed = debouncedText.trim()
    if (trimmed !== syncedText.current) {
      syncedText.current = trimmed
      filters.setText(debouncedText)
    }
  }, [debouncedText, filters])

  useEffect(() => {
    if (filters.state.q !== syncedText.current) {
      syncedText.current = filters.state.q
      setText(filters.state.q)
    }
  }, [filters.state.q])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    filtersButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!isDrawerOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    drawerRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDrawerOpen, closeDrawer])

  const usersQuery = useUsers(filters.state)
  const facetsQuery = useFacets(filters.state)
  const activeFilterCount = filters.state.hobbies.length + filters.state.nationalities.length

  const sidebar = (
    <FacetSidebar
      facets={facetsQuery.data}
      isPending={facetsQuery.isPending}
      isError={facetsQuery.isError}
      isStale={facetsQuery.isPlaceholderData}
      state={filters.state}
      onToggleHobby={filters.toggleHobby}
      onToggleNationality={filters.toggleNationality}
      onRetry={() => void facetsQuery.refetch()}
    />
  )

  return (
    <div className="flex h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-base font-semibold">User Directory</h1>
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
          <SearchInput value={text} onChange={setText} />
        </div>
        <SortControls
          sort={filters.state.sort}
          order={filters.state.order}
          onSortChange={filters.setSort}
          onOrderChange={filters.setOrder}
        />
        <button
          type="button"
          ref={filtersButtonRef}
          aria-expanded={isDrawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm lg:hidden"
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-70 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:block">
          {sidebar}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col pt-2">
          <ActiveFilters
            hobbies={filters.state.hobbies}
            nationalities={filters.state.nationalities}
            onRemoveHobby={filters.toggleHobby}
            onRemoveNationality={filters.toggleNationality}
            onClearAll={filters.clearAll}
          />
          <div className="min-h-0 flex-1">
            <UserList query={usersQuery} onClearFilters={filters.clearAll} />
          </div>
        </main>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-10 flex lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={closeDrawer}
            className="flex-1 bg-slate-900/40"
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="w-72 overflow-y-auto bg-white outline-none"
          >
            {sidebar}
          </div>
        </div>
      )}
    </div>
  )
}
