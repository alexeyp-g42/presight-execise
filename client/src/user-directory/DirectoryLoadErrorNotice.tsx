import {
  DIRECTORY_NOTICE_ACTION,
  DIRECTORY_NOTICE_MESSAGE,
  DIRECTORY_NOTICE_SURFACE,
} from "./directoryNoticeSurface";

/* The first page failed, so there are no rows to keep and the pane is the
   error. Its counterpart is `NextPageErrorRow`, which is the same failure with
   rows behind it and therefore a very different surface.

   **One generic message, deliberately.** The error envelope carries five codes
   and four of them cannot reach this client: nuqs parses the sort and direction
   against the contract's arrays before a request exists, cursors are never
   user-authored and never outlive the query key that minted them, the client
   calls two endpoints and no others, and a selection matching nothing is a
   `200`. What is left is `INTERNAL` and the network being down — neither of
   which the viewer can act on differently, and both of which are answered by
   the same press. Naming them would be detail for its own sake.

   Retry rather than a page refresh: a transient failure should not cost the
   view, and the view is in the URL either way — but a refresh also throws away
   the sidebar's response and every page of a list the viewer had scrolled. */

type DirectoryLoadErrorNoticeProps = {
  onRetry: () => void;
};

export const DirectoryLoadErrorNotice = ({ onRetry }: DirectoryLoadErrorNoticeProps) => (
  /* `role="alert"` rather than a plain box: this replaces content the viewer was
     waiting for, and it arrives without them having done anything to cause it. */
  <div role="alert" className={DIRECTORY_NOTICE_SURFACE}>
    <p className={DIRECTORY_NOTICE_MESSAGE}>Couldn’t load the directory.</p>

    <button type="button" onClick={onRetry} className={DIRECTORY_NOTICE_ACTION}>
      Retry
    </button>
  </div>
);
