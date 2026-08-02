import type { FacetValue } from '@contract';
import { cn } from '../lib/cn';

interface Props {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}

/**
 * Each row is backed by a bar proportional to its count, so the group reads as
 * a distribution of the current result set rather than a list of checkboxes.
 * Typing redistributes the bars, which is the clearest signal that the counts
 * describe what is on screen and not the whole directory.
 */
export function FacetGroup({ title, values, selected, onToggle }: Props) {
  const max = values.reduce((highest, facet) => Math.max(highest, facet.count), 0);

  // A selected value normally appears in its own list anyway — every matched
  // user holds it, so it ties for first place. Pinning only matters past
  // twenty selections in one group, where the real selection would drop off
  // the truncated list and become impossible to remove.
  const pinned = selected.filter((value) => !values.some((facet) => facet.value === value));

  return (
    <section>
      <h2 className="eyebrow mb-2">{title}</h2>

      {values.length === 0 && pinned.length === 0 ? (
        <p className="py-1 text-sm text-faint">None in this result set</p>
      ) : (
        <ul className="space-y-px">
          {pinned.map((value) => (
            <FacetRow key={value} value={value} count={null} width={0} selected onToggle={onToggle} />
          ))}
          {values.map((facet) => (
            <FacetRow
              key={facet.value}
              value={facet.value}
              count={facet.count}
              width={max > 0 ? (facet.count / max) * 100 : 0}
              selected={selected.includes(facet.value)}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface RowProps {
  value: string;
  count: number | null;
  width: number;
  selected: boolean;
  onToggle: (value: string) => void;
}

function FacetRow({ value, count, width, selected, onToggle }: RowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(value)}
        aria-pressed={selected}
        className={cn(
          'relative flex w-full items-center justify-between gap-2 overflow-hidden rounded px-2 py-1 text-left text-sm transition-colors',
          selected ? 'bg-accent text-accent-ink' : 'text-ink hover:bg-bar',
        )}
      >
        {!selected && width > 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-bar transition-[width] duration-200"
            style={{ width: `${width}%` }}
          />
        )}
        <span className="relative truncate">{value}</span>
        {count !== null && (
          <span className={cn('num relative shrink-0 text-xs', selected ? 'opacity-70' : 'text-faint')}>
            {count.toLocaleString()}
          </span>
        )}
      </button>
    </li>
  );
}
