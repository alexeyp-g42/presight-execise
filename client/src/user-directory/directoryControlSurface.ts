/* The box every control in the header paints — the search box and both sort
   selects. One string rather than three near-identical ones, for the reason
   the card and its skeleton share one: the focus ring is the part that must
   not drift, and a ring tweaked on the search box alone is a keyboard viewer
   losing the outline on half the header.

   No padding here — a select and a text input want different insets, and that
   is the one thing about them that legitimately differs. */
export const DIRECTORY_CONTROL_SURFACE =
  "rounded-lg border border-slate-300 bg-white py-1.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-2 focus:outline-offset-2 focus:outline-slate-400";

/** The text beside a control that names it, where the name is visible. */
export const DIRECTORY_CONTROL_LABEL = "text-xs font-medium text-slate-500";
