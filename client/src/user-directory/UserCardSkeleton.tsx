/* The `+1` row at the end of the list while another page is on its way. It is a
   virtualized row like any other and the same fixed height as a card, so the
   real user that replaces it lands exactly where the skeleton stood — nothing
   below it moves, and the scrollbar does not twitch. */
export const UserCardSkeleton = () => (
  <div
    role="status"
    aria-label="Loading more people"
    className="flex h-full items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 sm:gap-4 sm:px-4"
  >
    <div className="size-12 shrink-0 animate-pulse rounded-full bg-slate-200 sm:size-14" />

    <div className="min-w-0 flex-1 space-y-2">
      <div className="h-4 w-40 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-24 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-32 max-w-full animate-pulse rounded-full bg-slate-100" />
    </div>
  </div>
);
