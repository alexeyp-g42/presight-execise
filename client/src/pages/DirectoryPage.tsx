import { useState } from 'react';
import { useUrlState } from '../state/url';
import { useUsersQuery, useFacetsQuery } from '../api/hooks';
import { Toolbar } from '../components/Toolbar';
import { Sidebar } from '../components/Sidebar';
import { UserList } from '../components/UserList';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export function DirectoryPage() {
  const { state, patch, toggleHobby, toggleNationality, clear } = useUrlState();
  const users = useUsersQuery(state);
  const facets = useFacetsQuery(state);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalLoaded = users.data?.pages.reduce((s, p) => s + p.items.length, 0) ?? 0;
  const isInitialLoading = users.isLoading;

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-white">
        <h1 className="text-lg font-semibold">User Directory</h1>
        <button
          type="button"
          className="md:hidden ml-auto px-3 py-1.5 text-sm rounded-md border border-gray-300"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-expanded={drawerOpen}
          aria-controls="filters-drawer"
        >
          Filters
        </button>
      </header>

      <Toolbar
        q={state.q}
        sort={state.sort}
        dir={state.dir}
        onQChange={(q) => patch({ q })}
        onSortChange={(sort) => patch({ sort })}
        onDirChange={(dir) => patch({ dir })}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div
          id="filters-drawer"
          className={
            drawerOpen
              ? 'flex flex-col absolute inset-0 z-10 bg-white md:static md:z-auto'
              : 'hidden md:flex md:flex-col'
          }
        >
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold">Filters</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close filters"
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300"
            >
              Done
            </button>
          </div>
          <Sidebar
            facets={facets.data}
            selectedHobbies={state.hobbies}
            selectedNationalities={state.nationalities}
            hasActiveFilters={state.q !== '' || state.hobbies.length > 0 || state.nationalities.length > 0}
            onToggleHobby={toggleHobby}
            onToggleNationality={toggleNationality}
            onClear={clear}
          />
        </div>

        <div className="flex-1 flex flex-col">
          {users.isError && (
            <ErrorState message={(users.error as Error).message} onRetry={() => users.refetch()} />
          )}
          {isInitialLoading && <LoadingSkeleton />}
          {!isInitialLoading && !users.isError && totalLoaded === 0 && <EmptyState onClear={clear} />}
          {!isInitialLoading && !users.isError && totalLoaded > 0 && <UserList query={users} />}
        </div>
      </div>
    </div>
  );
}
