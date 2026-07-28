import type { UserDTO } from '@shared/types';

export function UserCard({ user }: { user: UserDTO }) {
  const shown = user.hobbies.slice(0, 2);
  const overflow = user.hobbies.length - shown.length;
  return (
    <article className="grid grid-cols-[64px_1fr] gap-4 p-4 bg-white rounded-lg shadow-sm">
      <img
        src={user.avatar}
        alt=""
        className="w-16 h-16 rounded-full bg-gray-100"
        loading="lazy"
      />
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold truncate">{user.first_name} {user.last_name}</h2>
        </div>
        <div className="flex items-baseline justify-between text-sm text-gray-600">
          <span className="truncate">{user.nationality}</span>
          <span>{user.age}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {shown.map((h) => (
            <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{h}</span>
          ))}
          {overflow > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">+{overflow}</span>
          )}
        </div>
      </div>
    </article>
  );
}
