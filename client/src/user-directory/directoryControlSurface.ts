/* The focus ring, and the box the header's controls paint around it. One
   module rather than a string per component, because the ring is the part that
   must not drift: a ring tweaked on the search box alone is a keyboard viewer
   losing the outline on half the directory.

   Two spellings of one ring, and they differ only in the trigger. A text input
   or a select rings on `focus`, because arriving in one is always the point; a
   chip rings on `focus-visible`, because it answers the mouse too and a ring
   painted after every click is the noise that gets focus rings removed
   altogether. Tailwind cannot prefix a string, so the geometry and hue are
   written out twice — kept adjacent so changing one is visibly changing the
   other, which is the whole reason they live here rather than at their two
   call sites. */
export const DIRECTORY_CONTROL_FOCUS_RING =
  "focus:outline-2 focus:outline-offset-2 focus:outline-slate-400";

export const DIRECTORY_TOGGLE_FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400";

/* The box every control in the header paints — the search box and both sort
   selects. One string rather than three near-identical ones, for the reason
   the card and its skeleton share one.

   No padding here — a select and a text input want different insets, and that
   is the one thing about them that legitimately differs. */
export const DIRECTORY_CONTROL_SURFACE = `rounded-lg border border-slate-300 bg-white py-1.5 text-sm text-slate-900 focus:border-slate-400 ${DIRECTORY_CONTROL_FOCUS_RING}`;

/** The text beside a control that names it, where the name is visible. */
export const DIRECTORY_CONTROL_LABEL = "text-xs font-medium text-slate-500";
