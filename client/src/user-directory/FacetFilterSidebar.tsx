import type { FacetsResponse } from "@presight/shared";
import { DirectoryResultCount } from "./DirectoryResultCount";
import { FacetSelectionControls } from "./FacetSelectionControls";

/* The sidebar, as a navigational instrument rather than a legend: every row is
   a value the viewer can press, carrying how much of the *current* result set
   it covers. What it renders is `FacetSelectionControls`, which the drawer
   renders too — this file is the wide-screen container around it and the result
   count above it, and nothing else.

   **It exists only from `lg` up**, where there is width to spend on a column
   beside the list. Below that it is `display: none` and `MobileFilterDrawer`
   carries the same controls behind a button, because a sidebar that eats half a
   phone makes the list unreadable and a band above the list pushes the results
   off the screen. Being out of the flow rather than merely narrow is the point:
   the list then gets the full width, and the layout below `lg` has one pane in
   it. */

export type FacetFilterSidebarProps = {
  /** The facet response, straight through. `undefined` only before the first one lands. */
  facets: FacetsResponse | undefined;
  /** Users on screen, for the result count. */
  shownCount: number;
  selectedHobbies: string[];
  selectedNationalities: string[];
  onToggleHobby: (hobby: string) => void;
  onToggleNationality: (nationality: string) => void;
};

export const FacetFilterSidebar = ({
  facets,
  shownCount,
  selectedHobbies,
  selectedNationalities,
  onToggleHobby,
  onToggleNationality,
}: FacetFilterSidebarProps) => (
  /* Its own scroll container, and `overscroll-contain` so reaching its end does
     not hand the scroll to the list beside it. Everything after `hidden` takes
     effect only once `lg:block` has displayed it, so there is no `lg:` prefix on
     each of them — a `display: none` element paints nothing to prefix. */
  <aside
    /* Not "Filters": a *filter* in this project is the whole predicate, and the
       plural would name each chip as one. The verb phrase says what the landmark
       is for without inventing a second word for a selection. */
    aria-label="Filter the directory"
    className="hidden w-72 shrink-0 overflow-y-auto overscroll-contain border-r border-slate-200 px-4 lg:block"
  >
    {facets && (
      <div className="space-y-4">
        <DirectoryResultCount shownCount={shownCount} total={facets.total} />

        <FacetSelectionControls
          facets={facets}
          selectedHobbies={selectedHobbies}
          selectedNationalities={selectedNationalities}
          onToggleHobby={onToggleHobby}
          onToggleNationality={onToggleNationality}
        />
      </div>
    )}
  </aside>
);
