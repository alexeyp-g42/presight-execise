import type { FacetEntry, FacetsResponse } from "@presight/shared";
import { useId } from "react";
import { FacetChipToggle } from "./FacetChipToggle";

/* Both facets as pressable rows — the whole of "controls for applying and
   removing hobby and nationality filters", and the only way into a selection.

   It is a component of its own rather than markup inside the sidebar because
   the same rows are reached two ways: from the sidebar on a wide screen, and
   from the drawer on a phone. Only the container differs — a landmark in the
   flow against a modal panel over it — so that is the only thing the two
   callers own.

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

export type FacetSelectionControlsProps = {
  /** The facet response, straight through. Callers hold the pane before the first one lands. */
  facets: FacetsResponse;
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

export const FacetSelectionControls = ({
  facets,
  selectedHobbies,
  selectedNationalities,
  onToggleHobby,
  onToggleNationality,
}: FacetSelectionControlsProps) => {
  /* One base rather than a `useId` per group — a hook cannot be called from the
     loop below, and a suffixed id is as unique as the base it is built on. It
     also keeps the sidebar's headings and the drawer's from colliding, since
     both are mounted at once and only one is displayed. */
  const headingId = useId();

  /* The hints say out loud what the counts mean, because the two facets read
     oppositely and the UI should not hide it: hobbies are ALL-of, so selecting
     more narrows and a count is who would be *left*; nationalities are ANY-of,
     so selecting more widens and a count is who would *join*. */
  const facetGroups = [
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
  ];

  return (
    <div className="space-y-4">
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
  );
};
