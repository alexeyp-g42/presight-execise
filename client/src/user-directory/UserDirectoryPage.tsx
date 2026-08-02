import type { UserFilter } from "../api/userDirectoryApi";
import { DirectoryLoadErrorNotice } from "./DirectoryLoadErrorNotice";
import { EmptyResultSetNotice } from "./EmptyResultSetNotice";
import { FacetFilterSidebar } from "./FacetFilterSidebar";
import { useDirectorySelection } from "./useDirectorySelection";
import { useFacetCounts } from "./useFacetCounts";
import { useSharedUrl } from "./useSharedUrl";
import { useUserDirectoryQuery } from "./useUserDirectoryQuery";
import { UserSearchInput } from "./UserSearchInput";
import { UserSortControls } from "./UserSortControls";
import { VirtualizedUserList } from "./VirtualizedUserList";

/* The app shell: a viewport-height column with a pinned header over the sidebar
   and the list. The header stays put because it is outside the scroll container
   rather than sticky inside one — and the two panes below each own their own
   scrolling, which is what leaves the virtualizer a single scroll element to
   watch.

   It is also where the URL meets the queries: the whole view comes from the
   address bar and both queries are keyed on it, so nothing on screen can
   disagree with the link the viewer would paste — there is no state here the
   URL does not already hold. */

export const UserDirectoryPage = () => {
  const { searchText, sort, dir, setSearchText, setSort, setDir } = useSharedUrl();
  const { hobbies, nationalities, toggleHobby, toggleNationality, clearSelections } =
    useDirectorySelection();

  /* The whole predicate, in one value both queries read. The list adds the
     order it is read in; the sidebar adds nothing — which is exactly why
     changing the sort leaves the sidebar untouched. */
  const filter: UserFilter = {
    /* The URL's search text, not the input's draft — one timer, at the URL
       boundary, debouncing the address bar and these fetches together. */
    q: searchText,
    hobbies,
    nationalities,
  };

  const {
    users,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isFirstLoad,
    isShowingPreviousView,
    isFirstPageError,
    isNextPageError,
    retryFirstPage,
  } = useUserDirectoryQuery({ ...filter, sort, dir });

  const { facets } = useFacetCounts(filter);

  /* Nobody matched, and it is an answer rather than an absence: the first load
     is still painting skeletons, and a view being replaced keeps the rows it
     already had — so the only way to be here with nothing is to have asked and
     been told nothing. */
  const isEmptyResultSet = !isFirstLoad && !isFirstPageError && users.length === 0;

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
          below its content, the page itself grows a scrollbar, and the panes
          stop being the only scroll containers. Column on a phone so the
          sidebar is a band above the list; a row once there is width for it. */}
      <main className="flex min-h-0 flex-1 flex-col gap-3 py-3 lg:flex-row lg:gap-4">
        <FacetFilterSidebar
          facets={facets}
          /* Every page fetched so far, which is what "showing" means when the
             list is one continuous scroll rather than a run of pages. Both
             queries now hold their previous response across a filter change, so
             this pair goes from one consistent reading to the next rather than
             through "Showing 0 of <the previous total>" on the way. */
          shownCount={users.length}
          selectedHobbies={hobbies}
          selectedNationalities={nationalities}
          onToggleHobby={toggleHobby}
          onToggleNationality={toggleNationality}
        />

        {/* A landmark rather than a bare `div`, because it is now three things
            over the session — the list, the empty result set and the failed
            first page — and a viewer who cannot see which one is on screen
            still has somewhere to jump to and something that says it is busy.

            `min-w-0` beside `min-h-0` for the row layout: a flex item defaults
            to its content's minimum width, and the cards would push the list
            wider than the space left rather than truncate inside it. */}
        <section
          aria-label="People in the directory"
          /* One attribute for every reason the pane is mid-answer: the first
             load, a view being replaced, and a page on its way. */
          aria-busy={isFirstLoad || isShowingPreviousView || isFetchingNextPage}
          /* The dim, and only for the middle of those three. Stale rows are
             still worth reading and still worth scrolling — they are just no
             longer the answer to the question the viewer has now asked, and
             taking them off the screen to say so would cost them their place
             every time they press a chip. */
          className={`min-h-0 min-w-0 flex-1 transition-opacity ${
            isShowingPreviousView ? "opacity-40" : ""
          }`}
        >
          {isFirstPageError ? (
            <DirectoryLoadErrorNotice onRetry={retryFirstPage} />
          ) : isEmptyResultSet ? (
            <EmptyResultSetNotice
              /* Read off the selections rather than tracked: the only thing
                 that can make the control a no-op is there being nothing
                 selected, and the URL already says. */
              canClearSelections={hobbies.length > 0 || nationalities.length > 0}
              onClearSelections={clearSelections}
            />
          ) : (
            <VirtualizedUserList
              users={users}
              isFirstLoad={isFirstLoad}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isNextPageError={isNextPageError}
              fetchNextPage={fetchNextPage}
            />
          )}
        </section>
      </main>
    </div>
  );
};
