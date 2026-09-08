import { useState } from 'react'

interface AvatarProps {
  src: string
  name: string
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function Avatar({ src, name }: AvatarProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
        {initialsOf(name)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      width={48}
      height={48}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-full bg-slate-200 object-cover"
    />
  )
}
