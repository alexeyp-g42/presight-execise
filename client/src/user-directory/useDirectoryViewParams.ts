import {
  DEFAULT_DIR,
  DEFAULT_SORT,
  SORT_DIRS,
  SORT_FIELDS,
  type SortDir,
  type SortField,
} from "@presight/shared";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

/* The address bar, as the view. Search text, sort field and sort direction live
   in the query string **in exactly the shape the API accepts**, so there is no
   translation layer between what the viewer can paste to a colleague and what
   the client sends — the same `q`, `sort` and `dir`, spelled the same way.

   nuqs runs router-free here: the app has zero routes, so a router imported for
   `useSearchParams` would be ~15kb and a provider for nothing. It also patches
   `pushState`/`replaceState` to re-sync, which is the exact gotcha a
   hand-rolled URL hook trips on — neither fires `popstate`. The adapter is
   mounted in `main.tsx`.

   Three separate `useQueryState` calls rather than one `useQueryStates`,
   because the history granularity below is per key and these three never change
   together: the two that push are discrete acts, the one that replaces is not. */

/* Typing must not flood the back button — `replace`, so a six-letter name
   leaves at most one entry rather than six. Blank is the default, so a cleared
   box drops `?q=` from the URL instead of leaving an empty key behind. */
const searchTextParser = parseAsString.withDefault("").withOptions({ history: "replace" });

/* Parsed against the contract package's arrays at the client boundary: a
   hand-edited `?sort=nickname` is not in `SORT_FIELDS`, so it falls back to the
   contract's own default here and never reaches the API as a request that
   would 400. The same is true of a link truncated mid-value.

   `push`, because choosing a sort is one deliberate act: back undoes exactly
   that change, and lands on a query key already in the cache — so it repaints
   without a request. Accepted cost, stated plainly: a run of sort toggles is
   that many back presses to leave the page. */
const sortFieldParser = parseAsStringLiteral(SORT_FIELDS)
  .withDefault(DEFAULT_SORT)
  .withOptions({ history: "push" });

const sortDirParser = parseAsStringLiteral(SORT_DIRS)
  .withDefault(DEFAULT_DIR)
  .withOptions({ history: "push" });

export type DirectoryViewParams = {
  /** The committed search text. Blank is the whole directory, never `q=`. */
  searchText: string;
  sort: SortField;
  dir: SortDir;
  /** Writes the URL — and, through it, the list's query key. */
  setSearchText: (searchText: string) => void;
  setSort: (sort: SortField) => void;
  setDir: (dir: SortDir) => void;
};

export const useDirectoryViewParams = (): DirectoryViewParams => {
  const [searchText, setSearchText] = useQueryState("q", searchTextParser);
  const [sort, setSort] = useQueryState("sort", sortFieldParser);
  const [dir, setDir] = useQueryState("dir", sortDirParser);

  return { searchText, sort, dir, setSearchText, setSort, setDir };
};
