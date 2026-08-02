import type { SortField, SortOrder } from '@contract';
import type { DirectoryParams } from '../state/directoryParams';
import { useFacets } from '../api/queries';
import { FacetGroup } from './FacetGroup';
import { SortControls } from './SortControls';
import { ErrorState, FacetSkeleton } from './states';

interface Props {
  params: DirectoryParams;
  onSortChange: (patch: { sort?: SortField; order?: SortOrder }) => void;
  onToggleHobby: (value: string) => void;
  onToggleNationality: (value: string) => void;
}

/**
 * The sidebar owns its own query, so a facet failure shows an error here while
 * the list keeps working — and the other way round.
 */
export function FilterSidebar({ params, onSortChange, onToggleHobby, onToggleNationality }: Props) {
  const { data, error, isPending, refetch } = useFacets(params);

  return (
    <div className="space-y-7">
      <section>
        <h2 className="eyebrow mb-2">Sort</h2>
        <SortControls sort={params.sort} order={params.order} onChange={onSortChange} />
      </section>

      {isPending && (
        <>
          <FacetSkeleton />
          <FacetSkeleton rows={6} />
        </>
      )}

      {error && (
        <ErrorState
          title="Couldn't load filters"
          message={error instanceof Error ? error.message : 'The request failed.'}
          onRetry={() => void refetch()}
        />
      )}

      {data && (
        <>
          <FacetGroup
            title="Hobbies"
            values={data.hobbies}
            selected={params.hobbies}
            onToggle={onToggleHobby}
          />
          <FacetGroup
            title="Nationalities"
            values={data.nationalities}
            selected={params.nationalities}
            onToggle={onToggleNationality}
          />
        </>
      )}
    </div>
  );
}
