import { SORT_FIELDS, type DirectoryState, type SortField } from "@/types/user";

export const DEFAULT_STATE: DirectoryState = {
  search: "",
  nationalities: [],
  hobbies: [],
  sort: "first_name",
  order: "asc",
};

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const isSortField = (value: string | null): value is SortField => SORT_FIELDS.includes(value as SortField);

export const parseState = (params: URLSearchParams): DirectoryState => {
  const sort = params.get("sort");
  const order = params.get("order");

  return {
    search: params.get("q")?.trim() ?? "",
    nationalities: unique(params.getAll("nationality")),
    hobbies: unique(params.getAll("hobby")),
    sort: isSortField(sort) ? sort : DEFAULT_STATE.sort,
    order: order === "asc" || order === "desc" ? order : DEFAULT_STATE.order,
  };
};

export const toSearchParams = (state: DirectoryState) => {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  state.nationalities.forEach((nationality) => params.append("nationality", nationality));
  state.hobbies.forEach((hobby) => params.append("hobby", hobby));
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.order !== DEFAULT_STATE.order) params.set("order", state.order);
  return params;
};

export const toggleValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
