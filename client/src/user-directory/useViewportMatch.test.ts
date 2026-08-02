import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useViewportMatch, VIEWPORT_QUERY } from "./useViewportMatch";

/* The setup file's `matchMedia` answers `false` to everything, which is the
   honest answer for a document with no viewport — but it makes this hook a
   constant. Swapped here for one that can be told to change, because what the
   hook is *for* is the moment the answer flips, and that moment is a
   subscription rather than a cascade. jsdom can answer it; only the CSS that
   crosses at the same width cannot. */

const realMatchMedia = window.matchMedia;

type Viewport = {
  crossInto: (matches: boolean) => void;
  listenerCount: () => number;
};

const controllableViewport = (): Viewport => {
  const listeners = new Set<() => void>();
  let matches = false;

  window.matchMedia = ((query: string) =>
    ({
      media: query,
      /* A getter, because `getSnapshot` builds a fresh `MediaQueryList` on each
         read — a captured boolean would answer with whatever was true when the
         object was made. */
      get matches() {
        return matches;
      },
      onchange: null,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

  return {
    crossInto: (next: boolean) => {
      act(() => {
        matches = next;
        listeners.forEach((notify) => notify());
      });
    },
    listenerCount: () => listeners.size,
  };
};

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe("useViewportMatch", () => {
  it("reports what the query says on the first render", () => {
    const viewport = controllableViewport();
    viewport.crossInto(true);

    const { result } = renderHook(() => useViewportMatch(VIEWPORT_QUERY.lg));

    expect(result.current).toBe(true);
  });

  it("re-reports when the viewport crosses the query", () => {
    const viewport = controllableViewport();
    const { result } = renderHook(() => useViewportMatch(VIEWPORT_QUERY.lg));

    expect(result.current).toBe(false);

    viewport.crossInto(true);

    expect(result.current).toBe(true);

    viewport.crossInto(false);

    expect(result.current).toBe(false);
  });

  it("subscribes once and lets go on unmount", () => {
    /* `useSyncExternalStore` re-subscribes whenever `subscribe` changes
       identity, so an unmemoized closure would leave a listener per render
       behind — invisible until something re-renders in a loop. */
    const viewport = controllableViewport();
    const { rerender, unmount } = renderHook(() => useViewportMatch(VIEWPORT_QUERY.lg));

    rerender();
    rerender();

    expect(viewport.listenerCount()).toBe(1);

    unmount();

    expect(viewport.listenerCount()).toBe(0);
  });
});
