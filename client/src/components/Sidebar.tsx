import type { FacetsResponse } from '@shared/types';
import { FacetList } from './FacetList';

interface Props {
  facets: FacetsResponse | undefined;
  selectedHobbies: string[];
  selectedNationalities: string[];
  hasActiveFilters: boolean;
  onToggleHobby: (v: string) => void;
  onToggleNationality: (v: string) => void;
  onClear: () => void;
}

export function Sidebar({
  facets,
  selectedHobbies,
  selectedNationalities,
  hasActiveFilters,
  onToggleHobby,
  onToggleNationality,
  onClear,
}: Props) {
  return (
    <aside
      aria-label="Filters"
      className="p-4 space-y-6 w-full md:w-72 md:border-r bg-white flex-1 min-h-0 overflow-y-auto"
    >
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
        >
          Clear filters
        </button>
      )}
      <FacetList
        title="Top hobbies"
        entries={facets?.hobbies ?? []}
        selected={selectedHobbies}
        onToggle={onToggleHobby}
      />
      <FacetList
        title="Top nationalities"
        entries={facets?.nationalities ?? []}
        selected={selectedNationalities}
        onToggle={onToggleNationality}
      />
    </aside>
  );
}
