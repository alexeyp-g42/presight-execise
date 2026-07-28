import { useEffect, useRef, useState } from 'react';
import type { SortField, SortDir } from '@shared/types';

interface Props {
  q: string;
  sort: SortField;
  dir: SortDir;
  onQChange: (q: string) => void;
  onSortChange: (s: SortField) => void;
  onDirChange: (d: SortDir) => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'last_name', label: 'Last name' },
  { value: 'first_name', label: 'First name' },
  { value: 'age', label: 'Age' },
  { value: 'nationality', label: 'Nationality' },
];

export function Toolbar({ q, sort, dir, onQChange, onSortChange, onDirChange }: Props) {
  const [draft, setDraft] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (draft === q) return;
    timer.current = setTimeout(() => onQChange(draft), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, q, onQChange]);

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-white border-b">
      <label className="flex-1 min-w-[220px]">
        <span className="sr-only">Search by name</span>
        <input
          aria-label="Search by name"
          type="search"
          placeholder="Search by name…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-gray-300"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span>Sort by</span>
        <select
          aria-label="Sort by"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortField)}
          className="px-2 py-2 rounded-md border border-gray-300"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label="Toggle sort direction"
        onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
        className="px-3 py-2 rounded-md border border-gray-300 text-sm"
      >
        {dir === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}
