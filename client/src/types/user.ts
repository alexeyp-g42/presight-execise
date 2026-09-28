export const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export interface Filters {
  search: string;
  nationalities: string[];
  hobbies: string[];
}

export interface DirectoryState extends Filters {
  sort: SortField;
  order: SortOrder;
}

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  nationalities: string[];
  hobbies: string[];
}

export interface UserPage {
  data: User[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}
