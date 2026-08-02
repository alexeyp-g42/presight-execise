import {
  DIRECTORY_NOTICE_ACTION,
  DIRECTORY_NOTICE_MESSAGE,
  DIRECTORY_NOTICE_SURFACE,
} from "./directoryNoticeSurface";

/* Nobody matches the predicate — a `200` with an empty result set, which this
   project treats as a normal answer rather than an error: the pinned-value rule
   exists precisely so a selection that matches nothing stays on screen and
   deselectable.

   The point of the surface is that it is a dead end the viewer can back out of.
   The chips in the sidebar are one way out and are still there; this is the
   other, and it is the one that does not require picking the selections apart
   one at a time.

   The control clears the **selections** and not the search text. A viewer who
   emptied the result set by typing has their way out in their hand already —
   the search box is in the header, holding the text that did it. Clearing that
   from over here would also delete something they typed on the strength of a
   button that never said it would, which is the kind of surprise a dead end can
   least afford. */

type EmptyResultSetNoticeProps = {
  /** False when nothing is selected, and the search text alone emptied the set. */
  canClearSelections: boolean;
  onClearSelections: () => void;
};

export const EmptyResultSetNotice = ({
  canClearSelections,
  onClearSelections,
}: EmptyResultSetNoticeProps) => (
  <div className={DIRECTORY_NOTICE_SURFACE}>
    <p className={DIRECTORY_NOTICE_MESSAGE}>Nobody matches this search.</p>

    {canClearSelections && (
      <button type="button" onClick={onClearSelections} className={DIRECTORY_NOTICE_ACTION}>
        Clear selections
      </button>
    )}
  </div>
);
