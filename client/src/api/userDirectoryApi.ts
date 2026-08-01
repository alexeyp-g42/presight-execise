import type { FacetsResponse, SortDir, SortField, UserListResponse } from "@presight/shared";
import axios from "axios";

/* The one module that talks to the API, and the only place a query string is
   built. axios is kept for its non-2xx throw and automatic JSON, which makes
   one rule binding rather than stylistic:

     Requests are handed a pre-built `URLSearchParams`. Never an object with
     array values.

   axios's default serializer turns `{ hobbies: ['chess'] }` into
   `hobbies[]=chess`, and the API rejects unknown keys outright — so the
   bracketed key is a hard 400, not a degraded result. A `URLSearchParams`
   instance bypasses the serializer entirely. `getJson` below is what keeps that
   from being a matter of discipline: its parameter is typed, so an object
   handed to any call site is a type error rather than a runtime 400. */

/** `/api` in every environment — one origin in the image, the Vite proxy in dev. */
const api = axios.create({ baseURL: "/api" });

const getJson = async <T>(
  path: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> => {
  const { data } = await api.get<T>(path, { params, signal });

  return data;
};

/** The whole predicate: search text plus one selection per dimension. */
export type UserFilter = {
  /** The search box's text. Absent or blank is the whole directory. */
  q?: string;
  /** ALL-of — a user must have every value, so selecting more narrows. */
  hobbies: string[];
  /** ANY-of — a user must have one of the values, so selecting more widens. */
  nationalities: string[];
};

/** The filter, plus the four params only the list endpoint understands. */
export type UserListRequest = UserFilter & {
  sort: SortField;
  dir: SortDir;
  limit: number;
  /** Absent on the first page. Every later page replays what the last one minted. */
  cursor?: string | null;
};

/* The limit the client sends, which is its own choice inside the API's 1–100 —
   named for the param rather than for a page, because there is no page number
   anywhere in the system. */
export const USER_LIST_LIMIT = 50;

/* Repeated keys rather than comma-joined values, because nationality display
   names contain commas ("Korea, Republic of") and hobbies are free text — a
   joined value would split one selection into two that match nothing, and only
   for some data. */
const appendSelection = (
  params: URLSearchParams,
  key: string,
  selection: string[],
): void => {
  for (const value of selection) {
    params.append(key, value);
  }
};

/** The params shared by every filtered query — and, deliberately, nothing else. */
export const buildUserFilterParams = ({
  q,
  hobbies,
  nationalities,
}: UserFilter): URLSearchParams => {
  const params = new URLSearchParams();

  /* Blank is absent, matching the server: a search box the viewer cleared has
     to return the whole directory rather than filter on the empty string. */
  if (q?.trim()) {
    params.set("q", q);
  }

  appendSelection(params, "hobbies", hobbies);
  appendSelection(params, "nationalities", nationalities);

  return params;
};

/* Composed from the base rather than sharing one builder with a flag. The
   facets endpoint parses the filter params *strictly*, so a `sort` that leaked
   into a facets request would be a loud 400 naming the key — which only stays
   true while the base builder cannot emit one. */
export const buildListUsersParams = ({
  sort,
  dir,
  limit,
  cursor,
  ...filter
}: UserListRequest): URLSearchParams => {
  const params = buildUserFilterParams(filter);

  params.set("sort", sort);
  params.set("dir", dir);
  params.set("limit", String(limit));

  /* Set only when there is one: the server reads an empty `?cursor=` as a
     malformed cursor rather than an absent one, so an unconditional `set`
     would 400 the first page of every query. */
  if (cursor) {
    params.set("cursor", cursor);
  }

  return params;
};

/** One page of the directory. Throws on any non-2xx, which the query surfaces as an error. */
export const fetchUserPage = (
  request: UserListRequest,
  signal?: AbortSignal,
): Promise<UserListResponse> =>
  getJson<UserListResponse>("/users", buildListUsersParams(request), signal);

/* What the result set is made of, plus its size. Takes a `UserFilter` and hands
   it to the *base* builder, which is what keeps the endpoint split honest from
   this side: the facets route parses the filter params strictly, so a `sort`
   reaching it would be a 400 naming the key — and the only builder in scope
   here cannot emit one. */
export const fetchFacets = (filter: UserFilter, signal?: AbortSignal): Promise<FacetsResponse> =>
  getJson<FacetsResponse>("/facets", buildUserFilterParams(filter), signal);
