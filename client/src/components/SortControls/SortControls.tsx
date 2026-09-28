import clsx from "clsx";
import { SORT_FIELDS, type SortField, type SortOrder } from "@/types/user";
import styles from "./SortControls.module.scss";

const SORT_LABELS: Record<SortField, string> = {
  first_name: "First name",
  last_name: "Last name",
  age: "Age",
  nationality: "Nationality",
};

interface SortControlsProps {
  sort: SortField;
  order: SortOrder;
  onChange: (sort: SortField, order: SortOrder) => void;
}

export const SortControls = ({ sort, order, onChange }: SortControlsProps) => {
  const isAscending = order === "asc";

  return (
    <div className={styles.controls}>
      <label htmlFor="sort-field" className={styles.label}>
        Sort
      </label>
      <select
        id="sort-field"
        className={styles.select}
        value={sort}
        onChange={(event) => onChange(event.target.value as SortField, order)}
      >
        {SORT_FIELDS.map((field) => (
          <option key={field} value={field}>
            {SORT_LABELS[field]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={clsx(styles.direction, !isAscending && styles.descending)}
        onClick={() => onChange(sort, isAscending ? "desc" : "asc")}
        aria-label={`Sorted ${isAscending ? "ascending" : "descending"}. Switch direction`}
        title={isAscending ? "Ascending" : "Descending"}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 15V5M5.5 9.5 10 5l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
};
