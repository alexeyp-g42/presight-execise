import type { UserFilter } from "../api/userDirectoryApi";
import { DirectoryLoadErrorNotice } from "./DirectoryLoadErrorNotice";
import { DirectoryResultCount } from "./DirectoryResultCount";
import { EmptyResultSetNotice } from "./EmptyResultSetNotice";
import { FacetFilterSidebar } from "./FacetFilterSidebar";
import { MobileFilterDrawer } from "./MobileFilterDrawer";
import { useDirectorySelection } from "./useDirectorySelection";
import { useFacetCounts } from "./useFacetCounts";
import { useSharedUrl } from "./useSharedUrl";
import { useUserDirectoryQuery } from "./useUserDirectoryQuery";
import { UserSearchInput } from "./UserSearchInput";
import { UserSortControls } from "./UserSortControls";
import { VirtualizedUserList } from "./VirtualizedUserList";

/* The app shell: a viewport-height column with a pinned header over the sidebar
   and the list. The header stays put because it is outside the scroll container
   rather than sticky inside one — at every breakpoint, with no `position:
   sticky` and no scroll margin to keep in step with its height.

   Below `lg` the sidebar leaves the flow entirely and the same controls arrive
   through `MobileFilterDrawer`, so the list has the full width and the layout
   is one pane. That is the whole responsive story, and it is CSS: the only
   thing JavaScript decides is the drawer's lifetime, which is a lifetime rather
   than a style.

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

  /* Every page fetched so far, which is what "showing" means when the list is
     one continuous scroll rather than a run of pages. Named once here because
     both layouts read it — the sidebar from `lg` up, the filter bar below it.

     Both queries now hold their previous response across a filter change, so
     this number and the total beside it go from one consistent reading to the
     next rather than through "Showing 0 of <the previous total>" on the way. */
  const shownCount = users.length;

  /* Nobody matched, and it is an answer rather than an absence: the first load
     is still painting skeletons, and a view being replaced keeps the rows it
     already had — so the only way to be here with nothing is to have asked and
     been told nothing. */
  const isEmptyResultSet = !isFirstLoad && !isFirstPageError && shownCount === 0;

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
          stops being the only scroll container. A single column below `lg`,
          where the sidebar is out of the flow; a row once there is width for
          the two of them side by side. */}
      <main className="flex min-h-0 flex-1 flex-col py-3 lg:flex-row lg:gap-4">
        <FacetFilterSidebar
          facets={facets}
          shownCount={shownCount}
          selectedHobbies={hobbies}
          selectedNationalities={nationalities}
          onToggleHobby={toggleHobby}
          onToggleNationality={toggleNationality}
        />

        {/* `min-w-0` beside `min-h-0` for the row layout: a flex item defaults
            to its content's minimum width, and the cards would push the list
            wider than the space left rather than truncate inside it. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* The filter bar the sidebar's absence leaves room for, and the only
              row this layout adds below `lg`. It carries the result count as
              well as the button, because that readout lived at the top of the
              sidebar and a phone would otherwise have to open the drawer to
              learn whether a selection did anything. */}
          <div className="flex shrink-0 items-center gap-3 px-3 pb-2 sm:px-4 lg:hidden">
            <div className="min-w-0 flex-1">
              {facets && <DirectoryResultCount shownCount={shownCount} total={facets.total} />}
            </div>

            <MobileFilterDrawer
              facets={facets}
              selectedHobbies={hobbies}
              selectedNationalities={nationalities}
              onToggleHobby={toggleHobby}
              onToggleNationality={toggleNationality}
            />
          </div>

          {/* A landmark rather than a bare `div`, because it is now three things
              over the session — the list, the empty result set and the failed
              first page — and a viewer who cannot see which one is on screen
              still has somewhere to jump to and something that says it is busy.

              It wraps the pane and not the filter bar above it, which is the
              reason the two are separate elements: the bar is not people, and a
              viewer whose results are mid-request still needs the Filters
              button at full contrast to be the way out of the view that is
              loading. */}
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
            className={`min-h-0 flex-1 transition-opacity ${
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
        </div>
      </main>
    </div>
  );
};
