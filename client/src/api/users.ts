import type { Facets, Filters, SortField, SortOrder, UserPage } from "@/types/user";
import { getJson } from "./http";

export const PAGE_SIZE = 40;

interface FetchUsersParams {
  filters: Filters;
  sort: SortField;
  order: SortOrder;
  cursor: string | null;
  signal?: AbortSignal;
}

const toFilterParams = ({ search, nationalities, hobbies }: Filters) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  nationalities.forEach((nationality) => params.append("nationality", nationality));
  hobbies.forEach((hobby) => params.append("hobby", hobby));
  return params;
};

export const fetchUsers = ({ filters, sort, order, cursor, signal }: FetchUsersParams) => {
  const params = toFilterParams(filters);
  params.set("sort", sort);
  params.set("order", order);
  params.set("limit", String(PAGE_SIZE));
  if (cursor) params.set("cursor", cursor);
  return getJson<UserPage>("/api/users", params, signal);
};

export const fetchFacets = (filters: Filters, signal?: AbortSignal) =>
  getJson<Facets>("/api/users/facets", toFilterParams(filters), signal);
