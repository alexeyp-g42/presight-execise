import { useSyncExternalStore } from "react";

/* The number the virtualizer is told is exact, and the number the rows are
   rendered at — one constant serving both, so they cannot disagree. A row is a
   card plus the gutter beneath it; the card itself is `h-full` and never asks
   for a height of its own.

   Two values because the card is denser on a narrow screen (smaller avatar,
   tighter gutter) and roomier once there is width for it. Everything else about
   the card is identical at both, by design: one-line truncation and the
   two-hobbies cap already make a 0-hobby and a 10-hobby user the same shape. */
export const USER_ROW_HEIGHT = {
  narrow: 104,
  wide: 116,
} as const;

/** Tailwind's `sm`, in the one place JS has to agree with CSS about where it is. */
const WIDE_SCREEN_QUERY = "(min-width: 40rem)";

const wideScreen = (): MediaQueryList => window.matchMedia(WIDE_SCREEN_QUERY);

const subscribe = (onBreakpointChange: () => void): (() => void) => {
  const query = wideScreen();

  query.addEventListener("change", onBreakpointChange);

  return () => query.removeEventListener("change", onBreakpointChange);
};

/* Returns a number, so React's identity check settles it — no cached snapshot
   object to keep stable and no re-render loop to avoid. */
const readRowHeight = (): number =>
  wideScreen().matches ? USER_ROW_HEIGHT.wide : USER_ROW_HEIGHT.narrow;

/** The exact height of one row at the current breakpoint. */
export const useUserRowHeight = (): number => useSyncExternalStore(subscribe, readRowHeight);
