import { useSharedUrl } from "./useSharedUrl";
import { useUserDirectoryQuery } from "./useUserDirectoryQuery";
import { UserSearchInput } from "./UserSearchInput";
import { UserSortControls } from "./UserSortControls";
import { VirtualizedUserList } from "./VirtualizedUserList";

/* The app shell: a viewport-height column with a pinned header over the list.
   The header stays put because it is outside the scroll container rather than
   sticky inside one — the list pane is the only thing that scrolls, which is
   what leaves the virtualizer a single scroll element to watch.

   It is also where the URL meets the query: the view comes from the address bar
   and the list is keyed on it, so the two cannot disagree — there is no state
   here that the URL does not already hold. Selections are still empty until the
   facet sidebar (#26) fills them from the same place. */

export const UserDirectoryPage = () => {
  const { searchText, sort, dir, setSearchText, setSort, setDir } = useSharedUrl();

  const { users, hasNextPage, isFetchingNextPage, fetchNextPage } = useUserDirectoryQuery({
    /* The URL's search text, not the input's draft — one timer, at the URL
       boundary, debouncing the address bar and this fetch together. */
    q: searchText,
    hobbies: [],
    nationalities: [],
    sort,
    dir,
  });

  return (
    <div className="flex h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        {/* One wrapping row, not a breakpoint's worth of layouts: the title, the
            search box and the sort controls each claim a width, and the header
            becomes three stacked rows on a phone and one row on a laptop
            because they stop fitting — not because a class said so. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="shrink-0 text-base font-semibold sm:text-lg">User directory</h1>

          <UserSearchInput searchText={searchText} onSearchTextChange={setSearchText} />

          <UserSortControls sort={sort} dir={dir} onSortChange={setSort} onDirChange={setDir} />
        </div>
      </header>

      {/* `min-h-0` is load-bearing: without it this flex child refuses to shrink
          below its content, the page itself grows a scrollbar, and the list
          stops being the only scroll container. */}
      <main className="min-h-0 flex-1 py-3">
        <VirtualizedUserList
          users={users}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </main>
    </div>
  );
};
