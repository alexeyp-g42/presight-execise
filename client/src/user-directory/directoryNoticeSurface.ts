import { DIRECTORY_TOGGLE_FOCUS_RING } from "./directoryControlSurface";

/* The box a surface paints when it stands in for the list, and the button it
   offers as the way on. One module rather than a string per component, for the
   reason the card and its skeleton share one: an empty result set and a failed
   first page are the same kind of moment for the viewer — the pane has nothing
   in it and there is exactly one thing to press — and the moment the two boxes
   drift they stop reading that way.

   `h-full` because the pane is a fixed-height flex child either way: the notice
   fills the space the list would have, so the sidebar beside it does not jump
   when one replaces the other. */
export const DIRECTORY_NOTICE_SURFACE =
  "flex h-full flex-col items-center justify-center gap-3 px-6 text-center";

/** The message inside it. Sized down from the cards so it reads as the pane speaking. */
export const DIRECTORY_NOTICE_MESSAGE = "text-sm text-slate-500";

/* Rings on `focus-visible` rather than `focus`, like the chips and unlike the
   header's inputs: this answers the mouse, and a ring painted after every click
   is the noise that gets focus rings removed altogether. */
export const DIRECTORY_NOTICE_ACTION = `shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 ${DIRECTORY_TOGGLE_FOCUS_RING}`;
