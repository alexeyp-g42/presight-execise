import { SearchInput } from "@/components/SearchInput";
import { SortControls } from "@/components/SortControls";
import type { SortField, SortOrder } from "@/types/user";
import styles from "./Header.module.scss";

interface HeaderProps {
  search: string;
  sort: SortField;
  order: SortOrder;
  activeFilterCount: number;
  isFiltersOpen: boolean;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: SortField, order: SortOrder) => void;
  onOpenFilters: () => void;
}

export const Header = ({
  search,
  sort,
  order,
  activeFilterCount,
  isFiltersOpen,
  onSearchChange,
  onSortChange,
  onOpenFilters,
}: HeaderProps) => (
  <header className={styles.header}>
    <div className={styles.brand}>
      <span className={styles.logo} aria-hidden="true">
        p
      </span>
      <h1 className={styles.title}>
        People <em>directory</em>
      </h1>
    </div>
    <div className={styles.search}>
      <SearchInput value={search} onChange={onSearchChange} />
    </div>
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.filtersButton}
        onClick={onOpenFilters}
        aria-controls="filters"
        aria-expanded={isFiltersOpen}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 5h14M6 10h8M8.5 15h3" strokeLinecap="round" />
        </svg>
        Filters
        {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
      </button>
      <SortControls sort={sort} order={order} onChange={onSortChange} />
    </div>
  </header>
);
