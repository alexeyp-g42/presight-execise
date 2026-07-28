import clsx from 'clsx';
import type { FacetEntry } from '@shared/types';

interface Props {
  title: string;
  entries: FacetEntry[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetList({ title, entries, selected, onToggle }: Props) {
  const sel = new Set(selected);
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <ul className="space-y-1">
        {entries.map((e) => {
          const isSel = sel.has(e.value);
          return (
            <li key={e.value}>
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => onToggle(e.value)}
                className={clsx(
                  'w-full flex items-center justify-between px-2 py-1 rounded text-sm text-left',
                  isSel ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
                )}
              >
                <span className="truncate">{e.value}</span>
                <span className="text-xs text-gray-500 ml-2">{e.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
