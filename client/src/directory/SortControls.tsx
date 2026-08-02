import { SORT_FIELDS, type SortField, type SortOrder } from '@contract';

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

export function SortControls({ sort, order, onChange }: Props) {
  const ascending = order === 'asc';

  return (
    <div className="flex gap-1.5">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Sort by</span>
        <select
          value={sort}
          onChange={(event) => onChange({ sort: event.target.value as SortField })}
          className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none transition-colors hover:border-faint focus:border-accent"
        >
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {LABELS[field]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => onChange({ order: ascending ? 'desc' : 'asc' })}
        title={ascending ? 'Sorted ascending' : 'Sorted descending'}
        aria-label={ascending ? 'Sorted ascending. Sort descending' : 'Sorted descending. Sort ascending'}
        className="num shrink-0 rounded-md border border-line bg-surface px-2.5 text-sm text-ink transition-colors hover:border-faint"
      >
        {ascending ? '↑' : '↓'}
      </button>
    </div>
  );
}
