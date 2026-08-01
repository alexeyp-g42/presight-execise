import type { User } from "@presight/shared";
import { USER_CARD_AVATAR, USER_CARD_SURFACE } from "./userCardSurface";

/* One person, at a height that never varies. The card takes the *full* hobby
   array and slices it itself — a component handed everything and showing two is
   honest about where the truncation lives, and it is the brief's cap, so it
   belongs with the thing the brief caps. */

/** The brief's cap: two hobbies, then `+n`. */
const VISIBLE_HOBBY_COUNT = 2;

/* Intrinsic size on the tag so the row holds the avatar's space while the SVG
   is in flight. CSS grows it at the wider breakpoint; the attributes only have
   to reserve a square. */
const AVATAR_SIZE = 48;

type UserDirectoryCardProps = {
  user: User;
};

export const UserDirectoryCard = ({ user }: UserDirectoryCardProps) => {
  const visibleHobbies = user.hobbies.slice(0, VISIBLE_HOBBY_COUNT);
  const remainingHobbies = user.hobbies.slice(VISIBLE_HOBBY_COUNT);
  /* One string, on both the tooltip and the label: `title` is hover-only, so
     the pointer and the screen reader would otherwise get different cards. */
  const remainingHobbiesLabel = `More hobbies: ${remainingHobbies.join(", ")}`;

  return (
    <article className={USER_CARD_SURFACE}>
      <img
        src={user.avatar}
        /* Empty on purpose: the name sits beside it, and an avatar that repeats
           it makes every row announce the person twice. */
        alt=""
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        className={`${USER_CARD_AVATAR} bg-slate-100`}
      />

      {/* `min-w-0` is what lets the children below truncate at all — a flex item
          defaults to its content's minimum width and would push the card wide
          rather than clip a long name. */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">
          {user.first_name} {user.last_name}
        </p>

        <p className="truncate text-sm text-slate-500">
          <span>{user.nationality}</span>
          <span aria-hidden="true" className="px-1.5 text-slate-300">
            ·
          </span>
          <span>{user.age}</span>
        </p>

        {/* Absent rather than empty when a user has no hobbies: the card is
            fixed-height regardless, so nothing shifts, and a screen reader is
            not handed an empty list to walk into. */}
        {user.hobbies.length > 0 && (
          <ul aria-label="Hobbies" className="mt-1.5 flex items-center gap-1.5 overflow-hidden">
            {visibleHobbies.map((hobby) => (
              <li
                key={hobby}
                className="max-w-[45%] shrink-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {hobby}
              </li>
            ))}

            {remainingHobbies.length > 0 && (
              /* A native tooltip is painted as an overlay, so it cannot change
                 the row's height. An inline expand could, and would desync the
                 virtualizer against a size it was told is exact. */
              <li
                title={remainingHobbiesLabel}
                aria-label={remainingHobbiesLabel}
                className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
              >
                +{remainingHobbies.length}
              </li>
            )}
          </ul>
        )}
      </div>
    </article>
  );
};
