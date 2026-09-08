import type { User } from '../api/types'
import { Avatar } from './Avatar'

const VISIBLE_HOBBIES = 2

export function UserCard({ user }: { user: User }) {
  const fullName = `${user.first_name} ${user.last_name}`
  const shown = user.hobbies.slice(0, VISIBLE_HOBBIES)
  const remaining = user.hobbies.length - shown.length

  return (
    <article className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <Avatar src={user.avatar} name={fullName} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-medium text-slate-900">{fullName}</h3>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-sm text-slate-500">
          <span className="truncate">{user.nationality}</span>
          <span className="shrink-0 tabular-nums">{user.age}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {shown.map((hobby) => (
            <span
              key={hobby}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {hobby}
            </span>
          ))}
          {remaining > 0 && (
            <span className="text-xs font-medium text-slate-400">+{remaining}</span>
          )}
        </div>
      </div>
    </article>
  )
}
