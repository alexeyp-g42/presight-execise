import { useCallback, useEffect, useState } from "react";
import { ActiveFilters } from "@/components/ActiveFilters";
import { FilterSidebar } from "@/components/FilterSidebar";
import { Header } from "@/components/Header";
import { UserList } from "@/components/UserList";
import { useDirectoryState } from "@/hooks/useDirectoryState";
import type { SortField, SortOrder } from "@/types/user";
import { toSearchParams, toggleValue } from "@/utils/urlState";
import styles from "./App.module.scss";

export const App = () => {
  const [state, updateState] = useDirectoryState();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleSearchChange = useCallback(
    (search: string) => updateState({ search }, { replace: true }),
    [updateState],
  );

  const handleSortChange = useCallback(
    (sort: SortField, order: SortOrder) => updateState({ sort, order }),
    [updateState],
  );

  const toggleNationality = useCallback(
    (value: string) => updateState({ nationalities: toggleValue(state.nationalities, value) }),
    [state.nationalities, updateState],
  );

  const toggleHobby = useCallback(
    (value: string) => updateState({ hobbies: toggleValue(state.hobbies, value) }),
    [state.hobbies, updateState],
  );

  const clearFilters = useCallback(() => updateState({ nationalities: [], hobbies: [] }), [updateState]);

  const clearAll = useCallback(
    () => updateState({ search: "", nationalities: [], hobbies: [] }),
    [updateState],
  );

  const closeFilters = useCallback(() => setIsFiltersOpen(false), []);

  useEffect(() => {
    if (!isFiltersOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFilters();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFiltersOpen, closeFilters]);

  return (
    <div className={styles.app}>
      <Header
        search={state.search}
        sort={state.sort}
        order={state.order}
        activeFilterCount={state.nationalities.length + state.hobbies.length}
        isFiltersOpen={isFiltersOpen}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onOpenFilters={() => setIsFiltersOpen(true)}
      />
      <div className={styles.layout}>
        <FilterSidebar
          state={state}
          isOpen={isFiltersOpen}
          onClose={closeFilters}
          onToggleNationality={toggleNationality}
          onToggleHobby={toggleHobby}
        />
        <main className={styles.main}>
          <div className={styles.toolbar}>
            <ActiveFilters
              nationalities={state.nationalities}
              hobbies={state.hobbies}
              onRemoveNationality={toggleNationality}
              onRemoveHobby={toggleHobby}
              onClear={clearFilters}
            />
          </div>
          <UserList state={state} resetKey={toSearchParams(state).toString()} onClearFilters={clearAll} />
        </main>
      </div>
    </div>
  );
};
