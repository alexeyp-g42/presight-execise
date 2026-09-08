import type { SortField, SortOrder } from '../api/types'

const FIELD_LABELS: Array<{ value: SortField; label: string }> = [
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'age', label: 'Age' },
  { value: 'nationality', label: 'Nationality' },
]

interface SortControlsProps {
  sort: SortField
  order: SortOrder
  onSortChange(sort: SortField): void
  onOrderChange(order: SortOrder): void
}

export function SortControls({ sort, order, onSortChange, onOrderChange }: SortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-500" htmlFor="sort-field">
        Sort
      </label>
      <select
        id="sort-field"
        value={sort}
        onChange={(event) => onSortChange(event.target.value as SortField)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
      >
        {FIELD_LABELS.map((field) => (
          <option key={field.value} value={field.value}>
            {field.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label={order === 'asc' ? 'Sort descending' : 'Sort ascending'}
        onClick={() => onOrderChange(order === 'asc' ? 'desc' : 'asc')}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm hover:bg-slate-50"
      >
        {order === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  )
}
