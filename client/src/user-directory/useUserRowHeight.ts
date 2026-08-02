import { useViewportMatch, VIEWPORT_QUERY } from "./useViewportMatch";

/* The number the virtualizer is told is exact, and the number the rows are
   rendered at — one constant serving both, so they cannot disagree. A row is a
   card plus the gutter beneath it; the card itself is `h-full` and never asks
   for a height of its own.

   Two values because the card is denser on a narrow screen (smaller avatar,
   tighter gutter) and roomier once there is width for it. Everything else about
   the card is identical at both, by design: one-line truncation and the
   two-hobbies cap already make a 0-hobby and a 10-hobby user the same shape.

   Note which breakpoint this is: `sm`, where the card's own padding changes —
   not `lg`, where the sidebar leaves the flow. A card is the same height with
   the sidebar beside it or gone, so the two are independent and the virtualizer
   is untouched by the layout switch. */
export const USER_ROW_HEIGHT = {
  narrow: 104,
  wide: 116,
} as const;

/** The exact height of one row at the current breakpoint. */
export const useUserRowHeight = (): number =>
  useViewportMatch(VIEWPORT_QUERY.sm) ? USER_ROW_HEIGHT.wide : USER_ROW_HEIGHT.narrow;
