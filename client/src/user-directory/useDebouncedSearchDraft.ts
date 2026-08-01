import { useCallback, useEffect, useRef, useState } from "react";

/* The whole of the client's debouncing, in the only place it can be: between
   the keystroke and the URL.

   The draft is ephemeral and local, so every keystroke paints on the frame it
   arrives. The committed value is the URL's, and the list query key reads that
   rather than the draft — so this single timer debounces the address bar and
   the fetch *together*, which is what buys the invariant that the URL always
   describes what is on screen.

   Rejected: nuqs' `limitUrlUpdates: debounce(300)`, which defers the URL write
   but not the state — the fetch would still fire per keystroke and need a
   second timer, and two timers can drift, leaving the address bar and the
   results disagreeing in between. A second timer anywhere in this client is a
   regression, not an optimisation. */

/** Long enough that a six-letter name is one request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 300;

export type DebouncedSearchDraftInput = {
  /** The committed search text — read from the URL, never from the draft. */
  searchText: string;
  /** Called once the viewer pauses. The timer's only job. */
  onSearchTextChange: (searchText: string) => void;
};

export type DebouncedSearchDraft = {
  /** What the input paints: the viewer's keystrokes, ahead of the URL. */
  draft: string;
  updateDraft: (draft: string) => void;
};

export const useDebouncedSearchDraft = ({
  searchText,
  onSearchTextChange,
}: DebouncedSearchDraftInput): DebouncedSearchDraft => {
  const [draft, setDraft] = useState(searchText);

  /* What this hook last handed to the URL. It is what tells an external change
     (the back button, a pasted link) apart from this hook's own commit
     arriving back as a prop — the first must replace the draft, the second
     must leave the keystrokes typed since the commit alone. */
  const committedSearchText = useRef(searchText);
  const pendingCommit = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Held in a ref rather than closed over, so the timer always calls the
     current handler and `updateDraft` never has to be rebuilt to keep up. */
  const commit = useRef(onSearchTextChange);

  useEffect(() => {
    commit.current = onSearchTextChange;
  });

  const cancelPendingCommit = useCallback(() => {
    if (pendingCommit.current !== null) {
      clearTimeout(pendingCommit.current);
      pendingCommit.current = null;
    }
  }, []);

  useEffect(() => {
    if (searchText === committedSearchText.current) {
      return;
    }

    /* The URL moved on its own, so it wins outright: anything typed before the
       navigation is dropped rather than allowed to fire afterwards and drag
       the view back off the entry the viewer just landed on. */
    cancelPendingCommit();
    committedSearchText.current = searchText;
    setDraft(searchText);
  }, [cancelPendingCommit, searchText]);

  /* Unmount only — the deps are stable, so this cannot fire between keystrokes
     and swallow a commit. */
  useEffect(() => cancelPendingCommit, [cancelPendingCommit]);

  const updateDraft = useCallback(
    (nextDraft: string) => {
      setDraft(nextDraft);
      cancelPendingCommit();

      pendingCommit.current = setTimeout(() => {
        pendingCommit.current = null;
        committedSearchText.current = nextDraft;
        commit.current(nextDraft);
      }, SEARCH_DEBOUNCE_MS);
    },
    [cancelPendingCommit],
  );

  return { draft, updateDraft };
};
