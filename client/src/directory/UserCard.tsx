import { memo, useMemo } from 'react';
import type { ApiUser } from '@contract';

interface Props {
  user: ApiUser;
  selectedHobbies: string[];
}

/**
 * Selected hobbies come first. Filtering by Chess should show Chess on the
 * card, not two alphabetically earlier hobbies with a `+n` hiding the one you
 * asked for. Presentation only — the API stays neutral about ordering.
 */
function orderHobbies(hobbies: string[], selected: string[]): string[] {
  if (selected.length === 0) return hobbies;
  const isSelected = (hobby: string) => selected.includes(hobby);
  return [...hobbies].sort((a, b) => Number(isSelected(b)) - Number(isSelected(a)));
}

export const UserCard = memo(function UserCard({ user, selectedHobbies }: Props) {
  const ordered = useMemo(
    () => orderHobbies(user.hobbies, selectedHobbies),
    [user.hobbies, selectedHobbies],
  );

  const shown = ordered.slice(0, 2);
  const overflow = ordered.length - shown.length;

  return (
    <article className="flex gap-4 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-faint">
      <img
        src={user.avatar}
        alt=""
        width={44}
        height={44}
        loading="lazy"
        decoding="async"
        className="size-11 shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium leading-tight text-ink">
          {user.first_name} {user.last_name}
        </h3>

        <div className="mt-1 flex items-baseline justify-between gap-3 text-sm text-muted">
          <span className="truncate">{user.nationality}</span>
          <span className="num shrink-0 text-xs">{user.age}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {shown.map((hobby) => (
            <span
              key={hobby}
              className={
                selectedHobbies.includes(hobby)
                  ? 'rounded bg-accent px-1.5 py-0.5 text-xs text-accent-ink'
                  : 'rounded border border-line px-1.5 py-0.5 text-xs text-muted'
              }
            >
              {hobby}
            </span>
          ))}
          {overflow > 0 && <span className="num text-xs text-faint">+{overflow}</span>}
        </div>
      </div>
    </article>
  );
});
