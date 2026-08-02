import type { FacetsResponse } from "@presight/shared";
import { useId } from "react";
import { DIRECTORY_TOGGLE_FOCUS_RING } from "./directoryControlSurface";
import { FacetSelectionControls } from "./FacetSelectionControls";
import { useFilterDrawer } from "./useFilterDrawer";

/* The facets on a phone: out of the flow, behind a button, with a badge saying
   how many selections are live.

   Both halves of that are the point. A sidebar that eats half a small screen
   makes the list unreadable, but filters that are simply hidden are filters
   nobody finds — and a viewer who cannot see that their view is filtered will
   read an empty list as a broken one. The badge is what resolves the pair: it
   is on screen at all times, so a filtered view is visible at a glance and the
   drawer only has to be opened to *change* something.

   **A real `<dialog>` opened with `showModal()`**, for the reason
   `FacetChipToggle` is a real `<button>`. The platform already contains focus,
   makes the rest of the page inert, closes on Escape, restores focus to the
   button afterwards, paints a `::backdrop`, and puts the panel in the top layer
   where no `z-index` or `overflow` on an ancestor can clip it. Every one of
   those is a line item on a hand-rolled `role="dialog"`, and the trap is the
   one people get subtly wrong.

   **On the word "Filters".** `CONTEXT.md` is strict that a *filter* is the whole
   predicate and a *selection* is what the viewer picked, which is why the
   sidebar's landmark is "Filter the directory" rather than "Filters". Nothing
   here contradicts that: "Filters" names the *control* — the one place the
   viewer goes to filter — and the count beside it is spelled "3 selected", in
   the glossary's own word. No chip is called a filter anywhere. */

export type MobileFilterDrawerProps = {
  /** The facet response, straight through. `undefined` only before the first one lands. */
  facets: FacetsResponse | undefined;
  selectedHobbies: string[];
  selectedNationalities: string[];
  onToggleHobby: (hobby: string) => void;
  onToggleNationality: (nationality: string) => void;
};

const CLOSE_BUTTON_CLASSES = `rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:text-slate-900 ${DIRECTORY_TOGGLE_FOCUS_RING}`;

export const MobileFilterDrawer = ({
  facets,
  selectedHobbies,
  selectedNationalities,
  onToggleHobby,
  onToggleNationality,
}: MobileFilterDrawerProps) => {
  const { drawerRef, isOpen, openDrawer, closeDrawer } = useFilterDrawer();
  const headingId = useId();

  /* Every value the viewer has picked, across both dimensions — one number,
     because the badge answers "is my view filtered, and by how much" rather
     than "which facets are involved". */
  const selectionCount = selectedHobbies.length + selectedNationalities.length;

  return (
    <>
      {/* No `lg:hidden` of its own: the row this sits in carries it, and the
          drawer's lifetime is held by the hook rather than by a class either
          way. Two spellings of one rule is how they start disagreeing. */}
      <button
        type="button"
        /* Says the button opens a dialog rather than a menu or a listbox, which
           is the only thing a screen reader cannot work out from the name. */
        aria-haspopup="dialog"
        /* Spelled out rather than left to name-from-content, which would run
           the two nodes together as "Filters3" — and a bare number beside a
           word reads as an ordinal anyway, so "Filters 3" would announce as a
           third filter rather than as three of them. It still opens with the
           visible word, so "click Filters" reaches it by voice. */
        aria-label={selectionCount > 0 ? `Filters, ${selectionCount} selected` : undefined}
        onClick={openDrawer}
        className={`flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 ${DIRECTORY_TOGGLE_FOCUS_RING}`}
      >
        Filters
        {selectionCount > 0 && (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white tabular-nums">
            {selectionCount}
          </span>
        )}
      </button>

      {/* `fixed inset-0` and the `max-*` resets override the UA's centred
          `fit-content` box — this element is the full-viewport region the panel
          sits in, so a press anywhere outside the panel lands on the dialog
          itself and closes it. `overflow-hidden` keeps *this* from being a
          scroll container; the panel's body below is the one that scrolls. */}
      <dialog
        ref={drawerRef}
        aria-labelledby={headingId}
        /* The DOM can close this without asking React — Escape and the browser's
           own dismissal both arrive here — so state is synced from the event
           rather than only written towards it. */
        onClose={closeDrawer}
        onClick={(event) => {
          if (event.target === drawerRef.current) closeDrawer();
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-slate-900/40"
      >
        <div className="flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 id={headingId} className="text-sm font-semibold text-slate-900">
              Filters
            </h2>

            {/* First focusable in the panel, which is where `showModal()` puts
                focus — so the drawer opens on the way out of itself rather than
                partway down a list of forty chips. It is outside the block
                below on purpose: focus has somewhere to land whether or not the
                facets have arrived. */}
            <button type="button" onClick={closeDrawer} className={CLOSE_BUTTON_CLASSES}>
              Close
            </button>
          </div>

          {/* The drawer's own scroll, and the one place the "list pane is the
              only scroll container" rule is read as being about the *flow*:
              forty chips do not fit on a phone, and this pane is an overlay in
              the top layer rather than something beside the list. `overscroll-
              contain` is what keeps that true in practice — reaching either end
              of it stops there instead of scrolling the list underneath. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {/* Mounted with the drawer rather than kept alive behind it. A
                closed `<dialog>` still renders its children, so leaving them
                here would put a second copy of all forty chips in the document
                at every width — including the desktop one, beside the sidebar's
                own. */}
            {isOpen && facets && (
              <FacetSelectionControls
                facets={facets}
                selectedHobbies={selectedHobbies}
                selectedNationalities={selectedNationalities}
                onToggleHobby={onToggleHobby}
                onToggleNationality={onToggleNationality}
              />
            )}
          </div>
        </div>
      </dialog>
    </>
  );
};
