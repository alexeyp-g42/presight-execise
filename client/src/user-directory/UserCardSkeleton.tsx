import { USER_CARD_AVATAR, USER_CARD_SURFACE } from "./userCardSurface";

/* A row that has not arrived yet — the screenful on the first load, and the
   `+1` row while another page is on its way. It is a virtualized row like any
   other and the same fixed height as a card, so the real user that replaces it
   lands exactly where it stood: nothing below it moves, and the scrollbar does
   not twitch.

   Decorative on purpose. A dozen of these paint at once on the first load, and
   a live region per box is a dozen announcements of one event; the pane carries
   `aria-busy` instead, which says the same thing once. `role="presentation"` is
   explicit rather than implied so it is legible as a decision — these are the
   shape of the answer, not the answer. */
export const UserCardSkeleton = () => (
  <div role="presentation" className={USER_CARD_SURFACE}>
    <div className={`${USER_CARD_AVATAR} animate-pulse bg-slate-200`} />

    <div className="min-w-0 flex-1 space-y-2">
      <div className="h-4 w-40 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-24 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-32 max-w-full animate-pulse rounded-full bg-slate-100" />
    </div>
  </div>
);
