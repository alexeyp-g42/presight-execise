/* "Showing 50 of 1,234" — the readout that tells the viewer at a glance whether
   a selection did anything, which a sidebar of counts alone cannot.

   The two numbers come from different places on purpose. The first is how many
   users are on screen, which is every page fetched so far. The second is the
   result set's size, and it travels on the **facets** endpoint and nowhere
   else: it depends on exactly the filter params, so it never recomputes while
   the viewer scrolls — the list endpoint answers a page and deliberately cannot
   say what stands behind it. */

type DirectoryResultCountProps = {
  /** Users on screen — every page fetched so far, not one page's worth. */
  shownCount: number;
  /** `total` from the facets response: the size of the whole result set. */
  total: number;
};

export const DirectoryResultCount = ({ shownCount, total }: DirectoryResultCountProps) => (
  /* No `aria-live` here, deliberately: this number also moves every time an
     infinite-scroll page lands, so announcing it would chatter through a
     scroll. The chips carry the state change a screen reader needs, in
     `aria-pressed`, at the moment the viewer causes it. */
  <p className="text-xs text-slate-500 tabular-nums">
    Showing {shownCount.toLocaleString()} of {total.toLocaleString()}
  </p>
);
