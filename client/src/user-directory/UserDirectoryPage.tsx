import { DEFAULT_DIR, DEFAULT_SORT } from "@presight/shared";
import { useUserDirectoryQuery, type UserDirectoryView } from "./useUserDirectoryQuery";
import { VirtualizedUserList } from "./VirtualizedUserList";

/* The app shell: a viewport-height column with a pinned header over the list.
   The header stays put because it is outside the scroll container rather than
   sticky inside one — the list pane is the only thing that scrolls, which is
   what leaves the virtualizer a single scroll element to watch. */

/* The whole directory in the contract's default order, until the search box and
   sort controls (#25) and the facet sidebar (#26) feed this from the URL. */
const WHOLE_DIRECTORY: UserDirectoryView = {
  hobbies: [],
  nationalities: [],
  sort: DEFAULT_SORT,
  dir: DEFAULT_DIR,
};

export const UserDirectoryPage = () => {
  const { users, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserDirectoryQuery(WHOLE_DIRECTORY);

  return (
    <div className="flex h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <h1 className="text-base font-semibold sm:text-lg">User directory</h1>
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
