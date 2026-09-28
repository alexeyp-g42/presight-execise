import {
  decodeCursor,
  SORT_FIELDS,
  type SortField,
  type SortOrder,
  type UserFilters,
  type UserQuery,
} from "./users.js";

type RawQuery = Record<string, unknown>;

export class QueryError extends Error {}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const toList = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const cleaned = values
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
};

const toText = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export const parseFilters = (query: RawQuery): UserFilters => {
  return {
    search: toText(query.search),
    nationalities: toList(query.nationality),
    hobbies: toList(query.hobby),
  };
};

export const parseUserQuery = (query: RawQuery): UserQuery => {
  const sort = toText(query.sort) || "first_name";
  if (!SORT_FIELDS.includes(sort as SortField)) {
    throw new QueryError(`sort must be one of: ${SORT_FIELDS.join(", ")}`);
  }

  const order = toText(query.order) || "asc";
  if (order !== "asc" && order !== "desc") {
    throw new QueryError("order must be asc or desc");
  }

  const rawLimit = toText(query.limit);
  const limit = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new QueryError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  const rawCursor = toText(query.cursor);
  const cursor = rawCursor ? decodeCursor(rawCursor) : null;
  if (rawCursor && !cursor) {
    throw new QueryError("cursor is invalid");
  }

  return {
    ...parseFilters(query),
    sort: sort as SortField,
    order: order as SortOrder,
    limit,
    cursor,
  };
};
