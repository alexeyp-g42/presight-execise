import type { FacetEntry, FacetsResponse } from "@presight/shared";
import { useId } from "react";
import { DirectoryResultCount } from "./DirectoryResultCount";
import { FacetChipToggle } from "./FacetChipToggle";

/* The sidebar, as a navigational instrument rather than a legend: every row is
   a value the viewer can press, carrying how much of the *current* result set
   it covers.

   **The chips are the single source of truth.** The facet arrays come back
   carrying every selected value — pinned there by the server, at its true
   count, `0` included — so there is no separate "active filters" region fed
   from URL state, and nothing here reconciles a response against a selection.
   This file renders what it was handed, in the order it was handed it, and asks
   the selection only which chips to mark.

   The one presentation choice it owns is pinning selected chips to the top, and
   it exists because the two facets sort differently: a selected hobby is held
   by everyone in the result set, so its count *is* the result-set size and it
   sorts up on its own — while a selected nationality is counted with its own
   selection dropped, and lands wherever its remaining count puts it. Without
   this the two dimensions would behave visibly differently for no reason the
   viewer could see. */

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

/* Stable by contract: `Array.prototype.sort` has been required to be stable
   since ES2019, so everything the server ordered by `count DESC, value ASC`
   keeps that order within each partition and only the selected values move. */
const selectedFirst = (entries: FacetEntry[], selection: string[]): FacetEntry[] => {
  const selected = new Set(selection);

  return [...entries].sort(
    (left, right) => Number(selected.has(right.value)) - Number(selected.has(left.value)),
  );
};

export const FacetFilterSidebar = ({
  facets,
  shownCount,
  selectedHobbies,
  selectedNationalities,
  onToggleHobby,
  onToggleNationality,
}: FacetFilterSidebarProps) => {
  /* One base rather than a `useId` per group — a hook cannot be called from the
     loop below, and a suffixed id is as unique as the base it is built on. */
  const headingId = useId();

  /* The hints say out loud what the counts mean, because the two facets read
     oppositely and the UI should not hide it: hobbies are ALL-of, so selecting
     more narrows and a count is who would be *left*; nationalities are ANY-of,
     so selecting more widens and a count is who would *join*. */
  const facetGroups = facets
    ? [
        {
          key: "hobbies",
          heading: "Hobbies",
          hint: "Narrows — each count is who would be left.",
          entries: selectedFirst(facets.hobbies, selectedHobbies),
          selection: new Set(selectedHobbies),
          onToggle: onToggleHobby,
        },
        {
          key: "nationalities",
          heading: "Nationalities",
          hint: "Widens — each count is who would join.",
          entries: selectedFirst(facets.nationalities, selectedNationalities),
          selection: new Set(selectedNationalities),
          onToggle: onToggleNationality,
        },
      ]
    : [];

  return (
    /* Its own scroll container, and `overscroll-contain` so reaching its end
       does not hand the scroll to the list beside it. On a narrow viewport it
       is a capped band above the list rather than a hidden drawer — hiding it
       would leave a phone with no way to filter at all.

       The border is what makes that band legible: a capped list cut off
       mid-entry with nothing under it reads as the page having ended, rather
       than as a pane that scrolls on its own. It moves to the side in the row
       layout, where it does the same job between the two panes. */
    <aside
      /* Not "Filters": a *filter* in this project is the whole predicate, and
         the plural would name each chip as one. The verb phrase says what the
         landmark is for without inventing a second word for a selection. */
      aria-label="Filter the directory"
      className="max-h-56 w-full shrink-0 overflow-y-auto overscroll-contain border-b border-slate-200 px-3 pb-3 sm:px-4 lg:max-h-none lg:w-72 lg:border-r lg:border-b-0 lg:pb-0"
    >
      {facets && (
        <div className="space-y-4">
          <DirectoryResultCount shownCount={shownCount} total={facets.total} />

          {facetGroups.map((group) => (
            <section key={group.key} aria-labelledby={`${headingId}-${group.key}`}>
              <h2
                id={`${headingId}-${group.key}`}
                className="text-xs font-semibold tracking-wide text-slate-900 uppercase"
              >
                {group.heading}
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">{group.hint}</p>

              <ul className="mt-2 space-y-1">
                {group.entries.map((entry) => (
                  <li key={entry.value}>
                    <FacetChipToggle
                      value={entry.value}
                      count={entry.count}
                      isSelected={group.selection.has(entry.value)}
                      onToggle={group.onToggle}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
};
