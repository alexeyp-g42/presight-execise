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
 * Rows rather than a native <select>: macOS renders a select's popup at the
 * system font size regardless of the element's own, so it cannot be made to
 * match the sidebar. Rows also reuse the facet-row language, which makes the
 * whole rail read as one control surface.
 *
 * Clicking the active field reverses the order, the way a sortable table
 * header does; the arrow on the active row is the affordance.
 *
 * Marked with `aria-current` rather than a listbox or radiogroup. Those roles
 * promise arrow-key navigation within a single tab stop, and a listbox option
 * may not contain interactive content — neither fits four ordinary buttons.
 * `aria-current` says exactly what is true: this is the active item in a set.
 * Each button's accessible name states what activating it will do, since the
 * active one reverses the order instead of re-selecting itself.
 */
export function SortControls({ sort, order, onChange }: Props) {
  const ascending = order === 'asc';

  return (
    <>
      <div role="group" aria-label="Sort by" className="space-y-px">
        {SORT_FIELDS.map((field) => {
          const active = field === sort;
          return (
            <button
              key={field}
              type="button"
              aria-current={active ? 'true' : undefined}
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
          );
        })}
      </div>

      {/* Changing the sort does not change the result count, so nothing else
          would announce it. */}
      <p role="status" className="sr-only">
        Sorted by {LABELS[sort]}, {ascending ? 'ascending' : 'descending'}
      </p>
    </>
  );
}
