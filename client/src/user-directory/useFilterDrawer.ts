import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useViewportMatch, VIEWPORT_QUERY } from "./useViewportMatch";

/* The drawer's whole moving part, kept out of the component that renders it —
   the same split `useVirtualUserRows` makes, and for the same reason: what is
   left in the component is markup.

   Two things live here. Whether the drawer is open, which is *not* only what
   the viewer last pressed; and the one place that answer meets the DOM, since
   a `<dialog>` is opened by calling a method on it rather than by rendering an
   attribute. */

export type FilterDrawerResult = {
  /** Attach to the `<dialog>` this drives — it is opened and closed through the element. */
  drawerRef: RefObject<HTMLDialogElement | null>;
  /** Whether the drawer is open *now*, breakpoint included. */
  isOpen: boolean;
  openDrawer: () => void;
  /** Also the `onClose` handler: the DOM can close a dialog without asking React. */
  closeDrawer: () => void;
};

export const useFilterDrawer = (): FilterDrawerResult => {
  const [wasOpened, setWasOpened] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);

  /* A modal must not outlive the button that opened it. From `lg` up that
     button is out of the layout and the sidebar carries the same controls, so a
     viewer who widens the window with the drawer open would be left holding a
     panel with no way back to it — and, until they found Escape, two copies of
     every chip.

     Derived rather than pushed into `wasOpened` from an effect: the width is
     not news to be stored, it is half of what being open *means*. The stored
     half then cleans itself up through the sync below, which closes the dialog
     and gets `closeDrawer` back through the element's own `close` event. */
  const hasRoomForSidebar = useViewportMatch(VIEWPORT_QUERY.lg);
  const isOpen = wasOpened && !hasRoomForSidebar;

  /* Both calls are guarded on what the dialog already is: `showModal()` on an
     open dialog throws `InvalidStateError`, and `close()` on a closed one is
     the no-op that would otherwise fire a second `close` event straight back
     into the state above. */
  useEffect(() => {
    const drawer = drawerRef.current;

    if (!drawer) return;

    if (isOpen && !drawer.open) drawer.showModal();
    if (!isOpen && drawer.open) drawer.close();
  }, [isOpen]);

  const openDrawer = useCallback(() => setWasOpened(true), []);
  const closeDrawer = useCallback(() => setWasOpened(false), []);

  return { drawerRef, isOpen, openDrawer, closeDrawer };
};
