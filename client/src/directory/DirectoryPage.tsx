import { useEffect, useState } from 'react';
import { useDirectoryParams } from '../state/useDirectoryParams';
import { activeFilterCount, toggleValue } from '../state/directoryParams';
import { SearchBar } from './SearchBar';
import { FilterSidebar } from './FilterSidebar';
import { ActiveFilters } from './ActiveFilters';
import { UserList } from './UserList';
import { cn } from '../lib/cn';

export function DirectoryPage() {
  const { params, update, clearAll } = useDirectoryParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = activeFilterCount(params);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen]);

  const toggleHobby = (value: string) => update({ hobbies: toggleValue(params.hobbies, value) });
  const toggleNationality = (value: string) =>
    update({ nationalities: toggleValue(params.nationalities, value) });

  const sidebar = (
    <FilterSidebar
      params={params}
      onSortChange={(patch) => update(patch)}
      onToggleHobby={toggleHobby}
      onToggleNationality={toggleNationality}
    />
  );

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col">
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="shrink-0 text-base font-semibold tracking-tight">Directory</h1>

          <div className="min-w-0 flex-1">
            {/* Typing replaces history entries, so Back undoes a filter rather
                than a single keystroke. */}
            <SearchBar value={params.q} onChange={(q) => update({ q }, { replace: true })} />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="shrink-0 rounded-md border border-line bg-surface px-3 py-2 text-sm transition-colors hover:border-faint md:hidden"
          >
            Filters
            {activeCount > 0 && <span className="num ml-1 text-xs text-muted">{activeCount}</span>}
          </button>
        </div>

        {activeCount > 0 && (
          <div className="mt-3">
            <ActiveFilters
              hobbies={params.hobbies}
              nationalities={params.nationalities}
              onRemoveHobby={toggleHobby}
              onRemoveNationality={toggleNationality}
              onClear={clearAll}
            />
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-line px-4 py-5 md:block">
          {sidebar}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col pt-4">
          <UserList params={params} onClear={clearAll} />
        </main>
      </div>

      {/* Mobile filter sheet */}
      <div className={cn('fixed inset-0 z-20 md:hidden', filtersOpen ? '' : 'pointer-events-none')}>
        <button
          type="button"
          tabIndex={filtersOpen ? 0 : -1}
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
          className={cn(
            'absolute inset-0 cursor-default bg-black/40 transition-opacity',
            filtersOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          role="dialog"
          aria-modal={filtersOpen}
          aria-label="Filters"
          className={cn(
            'absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-xl border-t border-line bg-paper px-4 pb-8 pt-4 transition-transform duration-200',
            filtersOpen ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Filters</h2>
            <button
              type="button"
              tabIndex={filtersOpen ? 0 : -1}
              onClick={() => setFiltersOpen(false)}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm transition-colors hover:border-faint"
            >
              Done
            </button>
          </div>
          {sidebar}
        </div>
      </div>
    </div>
  );
}
