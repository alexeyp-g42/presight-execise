import { DIRECTORY_NOTICE_ACTION } from "./directoryNoticeSurface";
import { USER_CARD_SURFACE } from "./userCardSurface";

/* The `+1` row, flipped from a skeleton to a way on after the page behind it
   failed. Same failure as `DirectoryLoadErrorNotice` and the same generic
   message, on a completely different surface for one reason: there are rows
   behind this one. Hundreds of them, possibly, scrolled to over several
   requests — so replacing the list with a centred error would throw away
   everything the viewer has, to report something that cost them the next fifty.

   It is the same box as the skeleton it replaces, which is the same box as a
   card, so the failure does not move a single row above it. Which is also why
   the retry is safe to press: the row it lands in is already the right shape
   for the cards that arrive.

   Nothing re-fetches on its own from here. `shouldFetchNextPage` stops at a
   failed page precisely so this control is the only way past it — otherwise the
   bottom of the list would hammer whatever just broke. */

type NextPageErrorRowProps = {
  onRetry: () => void;
};

export const NextPageErrorRow = ({ onRetry }: NextPageErrorRowProps) => (
  /* `role="status"` rather than the notice's `alert`: the rows are all still
     here, so this is the list reporting where it stopped rather than the pane
     losing its contents. */
  <div role="status" className={`${USER_CARD_SURFACE} justify-between`}>
    <p className="min-w-0 truncate text-sm text-slate-500">Couldn’t load more.</p>

    <button type="button" onClick={onRetry} className={DIRECTORY_NOTICE_ACTION}>
      Retry
    </button>
  </div>
);
