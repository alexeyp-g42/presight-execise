/* One value the sidebar offers, and the only way into a selection.

   A real `<button type="button">` rather than a styled `div` or a checkbox in
   disguise: the button already arrives tabbable, already toggles on Enter *and*
   Space, and already has the activation behaviour a `div` would need rebuilt
   from a `keydown` handler that is wrong on one of the two keys more often than
   not. `aria-pressed` is what makes it a *toggle* rather than a command — a
   screen reader announces "pressed", so the selections are readable without
   inferring them from a colour.

   Cheap now, expensive later: retrofitting this onto a `div` means finding
   every one of those affordances again, in a codebase where the mouse path has
   been working the whole time. */

import { DIRECTORY_TOGGLE_FOCUS_RING } from "./directoryControlSurface";

type FacetChipToggleProps = {
  /** The facet value, verbatim — what the request will carry. */
  value: string;
  /** How much of the result set it covers. `0` is a real answer, not a reason to hide. */
  count: number;
  isSelected: boolean;
  onToggle: (value: string) => void;
};

/* Selected reads as filled, unselected as outlined — a difference in weight as
   well as in hue, so the state survives a monochrome display and the readers
   who would see the two fills as one colour. */
const SELECTED_CHIP_SURFACE = "border-slate-900 bg-slate-900 text-white";
const UNSELECTED_CHIP_SURFACE =
  "border-slate-200 bg-white text-slate-700 hover:border-slate-400";

export const FacetChipToggle = ({ value, count, isSelected, onToggle }: FacetChipToggleProps) => (
  <button
    type="button"
    /* Not `aria-checked`: that belongs to a radio or a checkbox role, and this
       is a button. `aria-pressed` is the toggle-button state. */
    aria-pressed={isSelected}
    onClick={() => onToggle(value)}
    className={`flex w-full items-center justify-between gap-2 rounded-full border px-3 py-1 text-left text-xs transition-colors ${DIRECTORY_TOGGLE_FOCUS_RING} ${
      isSelected ? SELECTED_CHIP_SURFACE : UNSELECTED_CHIP_SURFACE
    }`}
  >
    {/* `min-w-0` is what lets a long free-text hobby truncate rather than push
        the chip past the sidebar's width. */}
    <span className="min-w-0 truncate">{value}</span>

    {/* Inside the button on purpose: the count is part of what the chip means,
        so it belongs in the name a screen reader reads out — "chess, 88" — and
        `toLocaleString` is what keeps four digits legible. */}
    <span
      className={`shrink-0 tabular-nums ${isSelected ? "text-slate-300" : "text-slate-400"}`}
    >
      {count.toLocaleString()}
    </span>
  </button>
);
