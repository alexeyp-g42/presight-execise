import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useEffect, type RefObject } from "react";

/* The virtualized list's whole moving part, kept out of the component that
   renders it. Two things live here: the window of rows to paint, and the
   decision to ask for another page.

   There is no sentinel element. Infinite scroll watches the last virtual row
   instead, which is why the row count is `users.length + 1` while more pages
   exist — the skeleton is a row like any other, so it cannot shift the cards
   above it, and its arrival in the rendered window is the trigger. */

export type ShouldFetchNextPageInput = {
  /** The last row the virtualizer is currently rendering. `-1` when it renders none. */
  lastItemIndex: number;
  /** Rows including the skeleton — so its index is `rowCount - 1`. */
  rowCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

/* Pure, exported and tested on its own: jsdom has no layout to drive the
   virtualizer with, but this is where the two failure modes live — a second
   request fired over one already in flight, and a request fired forever at the
   bottom of a list with nothing left to fetch. */
export const shouldFetchNextPage = ({
  lastItemIndex,
  rowCount,
  hasNextPage,
  isFetchingNextPage,
}: ShouldFetchNextPageInput): boolean =>
  hasNextPage &&
  !isFetchingNextPage &&
  /* Both halves are needed: an empty window reports `-1`, and on an empty list
     `rowCount - 1` is `-1` as well, so the comparison alone would say yes. */
  lastItemIndex >= 0 &&
  lastItemIndex >= rowCount - 1;

export type VirtualUserRowsInput = {
  /** Every user fetched so far, across every page. */
  userCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** The list pane — the only scroll container in the app, at every breakpoint. */
  scrollElementRef: RefObject<HTMLElement | null>;
  /** Fixed per breakpoint, which is what makes the estimate below exact. */
  rowHeight: number;
};

/* Rows rendered beyond the viewport in each direction. Also how far ahead the
   next page is asked for: the skeleton row enters the window this many rows
   before it is on screen. */
const OVERSCAN = 5;

export const useVirtualUserRows = ({
  userCount,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  scrollElementRef,
  rowHeight,
}: VirtualUserRowsInput): {
  virtualRows: VirtualItem[];
  totalSize: number;
} => {
  const rowCount = hasNextPage ? userCount + 1 : userCount;

  /* The virtualizer hands back functions the React Compiler cannot memoize
     safely, which it warns about even though the compiler is not enabled here
     (see `client/README.md`). Silenced with the reason rather than left to
     print on every lint run — a warning nobody can act on is how a lint step
     stops being read. */
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElementRef.current,
    /* Exact rather than estimated — every card is the same fixed height, so no
       measurement pass ever runs, the total scroll height is right on the first
       frame, and the scrollbar cannot drift as pages land. */
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const lastItemIndex = virtualRows.at(-1)?.index ?? -1;

  /* `estimateSize` is read when a row is measured and not re-read on its own,
     so a breakpoint change has to say so explicitly. The virtualizer instance
     is stable, so this fires on mount and then only when the height changes. */
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, rowHeight]);

  useEffect(() => {
    if (shouldFetchNextPage({ lastItemIndex, rowCount, hasNextPage, isFetchingNextPage })) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, lastItemIndex, rowCount]);

  return { virtualRows, totalSize: virtualizer.getTotalSize() };
};
