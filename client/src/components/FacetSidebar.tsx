import type { Facets, FilterState } from '../api/types'
import { FacetGroup } from './FacetGroup'
import { StatusPanel } from './StatusPanel'

interface FacetSidebarProps {
  facets: Facets | undefined
  isPending: boolean
  isError: boolean
  isStale: boolean
  state: FilterState
  onToggleHobby(value: string): void
  onToggleNationality(value: string): void
  onRetry(): void
}

export function FacetSidebar({
  facets,
  isPending,
  isError,
  isStale,
  state,
  onToggleHobby,
  onToggleNationality,
  onRetry,
}: FacetSidebarProps) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="h-6 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    )
  }

  if (isError || !facets) {
    return (
      <div className="p-4">
        <StatusPanel
          variant="error"
          message="Could not load filters"
          actionLabel="Retry"
          onAction={onRetry}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <FacetGroup
        title="Nationalities"
        values={facets.nationalities}
        selected={state.nationalities}
        onToggle={onToggleNationality}
        isStale={isStale}
      />
      <FacetGroup
        title="Hobbies"
        values={facets.hobbies}
        selected={state.hobbies}
        onToggle={onToggleHobby}
        isStale={isStale}
      />
    </div>
  )
}
