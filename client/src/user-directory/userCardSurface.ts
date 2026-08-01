/* The box a row paints, shared by the card and the skeleton that stands in for
   it. One string rather than two identical ones because the skeleton's whole
   job is to be the same box: fixed row height already guarantees nothing moves
   when real data lands, and a padding tweak on one side alone would undo that
   for the width instead.

   No height here — the row owns that, and the card is `h-full` inside it. */
export const USER_CARD_SURFACE =
  "flex h-full items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 sm:gap-4 sm:px-4";

/** The avatar, and the shimmer standing in for it — same size, same place. */
export const USER_CARD_AVATAR = "size-12 shrink-0 rounded-full sm:size-14";
