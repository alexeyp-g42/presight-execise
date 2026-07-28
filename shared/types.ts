export type SortField = 'first_name' | 'last_name' | 'age' | 'nationality';
export type SortDir = 'asc' | 'desc';

export interface UserDTO {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface UsersResponse {
  items: UserDTO[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FacetEntry {
  value: string;
  count: number;
}

export interface FacetsResponse {
  hobbies: FacetEntry[];
  nationalities: FacetEntry[];
}

export interface ApiError {
  error: { code: string; message: string };
}
