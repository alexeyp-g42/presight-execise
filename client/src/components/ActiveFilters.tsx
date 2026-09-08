interface ActiveFiltersProps {
  hobbies: string[]
  nationalities: string[]
  onRemoveHobby(value: string): void
  onRemoveNationality(value: string): void
  onClearAll(): void
}

export function ActiveFilters({
  hobbies,
  nationalities,
  onRemoveHobby,
  onRemoveNationality,
  onClearAll,
}: ActiveFiltersProps) {
  if (hobbies.length === 0 && nationalities.length === 0) {
    return null
  }

  const chips = [
    ...nationalities.map((value) => ({ value, remove: onRemoveNationality })),
    ...hobbies.map((value) => ({ value, remove: onRemoveHobby })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          aria-label={`Remove filter ${chip.value}`}
          onClick={() => chip.remove(chip.value)}
          className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs text-white hover:bg-slate-700"
        >
          {chip.value}
          <span aria-hidden="true">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="px-1 text-xs font-medium text-slate-500 underline hover:text-slate-900"
      >
        Clear all
      </button>
    </div>
  )
}
