import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchFacets, fetchUsers } from "@/api/users";
import type { DirectoryState, Filters } from "@/types/user";

const toFilters = ({ search, nationalities, hobbies }: DirectoryState): Filters => ({
  search,
  nationalities,
  hobbies,
});

export const useUsers = (state: DirectoryState) => {
  const filters = toFilters(state);
  const { sort, order } = state;

  return useInfiniteQuery({
    queryKey: ["users", filters, sort, order],
    queryFn: ({ pageParam, signal }) => fetchUsers({ filters, sort, order, cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  });
};

export const useFacets = (state: DirectoryState) => {
  const filters = toFilters(state);

  return useQuery({
    queryKey: ["facets", filters],
    queryFn: ({ signal }) => fetchFacets(filters, signal),
    placeholderData: keepPreviousData,
  });
};
