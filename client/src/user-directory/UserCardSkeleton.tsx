import { USER_CARD_AVATAR, USER_CARD_SURFACE } from "./userCardSurface";

/* The `+1` row at the end of the list while another page is on its way. It is a
   virtualized row like any other and the same fixed height as a card, so the
   real user that replaces it lands exactly where the skeleton stood — nothing
   below it moves, and the scrollbar does not twitch. */
export const UserCardSkeleton = () => (
  <div role="status" aria-label="Loading more people" className={USER_CARD_SURFACE}>
    <div className={`${USER_CARD_AVATAR} animate-pulse bg-slate-200`} />

    <div className="min-w-0 flex-1 space-y-2">
      <div className="h-4 w-40 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-24 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-32 max-w-full animate-pulse rounded-full bg-slate-100" />
    </div>
  </div>
);
