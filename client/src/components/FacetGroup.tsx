import type { FacetValue } from '../api/types'

interface FacetGroupProps {
  title: string
  values: FacetValue[]
  selected: string[]
  onToggle(value: string): void
  isStale: boolean
}

export function FacetGroup({ title, values, selected, onToggle, isStale }: FacetGroupProps) {
  return (
    <section className={isStale ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {values.length === 0 ? (
        <p className="text-sm text-slate-400">No matching {title.toLowerCase()}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {values.map((facet) => {
            const isSelected = selected.includes(facet.value)
            return (
              <li key={facet.value}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggle(facet.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm ${
                    isSelected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{facet.value}</span>
                  <span className="shrink-0 text-xs tabular-nums opacity-70">{facet.count}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
