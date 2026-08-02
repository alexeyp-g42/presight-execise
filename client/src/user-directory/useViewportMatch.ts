import { useCallback, useSyncExternalStore } from "react";

/* The one place JS agrees with CSS about where the breakpoints are.

   Layout is Tailwind's job and stays in the classes — a component that reads a
   width to decide what to render has moved the cascade into JavaScript, and
   jsdom then cannot answer either half of it. Two things genuinely cannot be
   expressed as a class and read the queries instead: the exact row height the
   virtualizer is told, and the drawer's lifetime, since a modal must not outlive
   the button that opened it.

   Written in `rem` because Tailwind's own breakpoints are, so a viewer with a
   larger base font crosses them in CSS and here at the same moment. */
export const VIEWPORT_QUERY = {
  sm: "(min-width: 40rem)",
  lg: "(min-width: 64rem)",
} as const;

/* Not `string`: an arbitrary media query is exactly the thing this module
   exists to prevent, and a second spelling of `64rem` somewhere else is how JS
   and CSS start disagreeing about where `lg` is. */
export type ViewportQuery = (typeof VIEWPORT_QUERY)[keyof typeof VIEWPORT_QUERY];

/** Whether the viewport currently matches, re-read whenever it stops or starts. */
export const useViewportMatch = (query: ViewportQuery): boolean => {
  /* Both memoized on the query: `useSyncExternalStore` re-subscribes whenever
     `subscribe` changes identity, so a fresh closure per render would tear the
     listener down and build it back on every one. */
  const subscribe = useCallback(
    (onViewportChange: () => void): (() => void) => {
      const media = window.matchMedia(query);

      media.addEventListener("change", onViewportChange);

      return () => media.removeEventListener("change", onViewportChange);
    },
    [query],
  );

  /* Returns a boolean, so React's identity check settles it — no cached
     snapshot object to keep stable and no re-render loop to avoid. */
  const getSnapshot = useCallback((): boolean => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
