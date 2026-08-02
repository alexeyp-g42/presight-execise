import { SORT_FIELDS, type SortField, type SortOrder } from '@contract';
import { cn } from '../lib/cn';

const LABELS: Record<SortField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  age: 'Age',
  nationality: 'Nationality',
};

interface Props {
  sort: SortField;
  order: SortOrder;
  onChange: (patch: { sort?: SortField; order?: SortOrder }) => void;
}

/**
 * Rows rather than a native <select>: macOS renders the select's popup at the
 * system font size regardless of the element's own, so it cannot be made to
 * match the rest of the sidebar. Rows also reuse the facet-row language, which
 * makes the whole rail read as one control surface.
 *
 * Clicking the active field flips the direction, the way a sortable table
 * header does; the arrow on the active row is the affordance.
 */
export function SortControls({ sort, order, onChange }: Props) {
  const ascending = order === 'asc';

  return (
    <ul className="space-y-px" role="listbox" aria-label="Sort by">
      {SORT_FIELDS.map((field) => {
        const active = field === sort;
        return (
          <li key={field}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() =>
                active ? onChange({ order: ascending ? 'desc' : 'asc' }) : onChange({ sort: field })
              }
              aria-label={
                active
                  ? `Sorted by ${LABELS[field]}, ${ascending ? 'ascending' : 'descending'}. Reverse the order`
                  : `Sort by ${LABELS[field]}`
              }
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm transition-colors',
                active ? 'bg-accent text-accent-ink' : 'text-ink hover:bg-bar',
              )}
            >
              <span className="truncate">{LABELS[field]}</span>
              {active && (
                <span aria-hidden className="num shrink-0 text-xs">
                  {ascending ? '↑' : '↓'}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
