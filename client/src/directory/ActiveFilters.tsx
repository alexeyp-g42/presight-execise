interface Props {
  hobbies: string[];
  nationalities: string[];
  onRemoveHobby: (value: string) => void;
  onRemoveNationality: (value: string) => void;
  onClear: () => void;
}

export function ActiveFilters({
  hobbies,
  nationalities,
  onRemoveHobby,
  onRemoveNationality,
  onClear,
}: Props) {
  if (hobbies.length === 0 && nationalities.length === 0) return null;

  const chips = [
    ...hobbies.map((value) => ({ value, remove: () => onRemoveHobby(value) })),
    ...nationalities.map((value) => ({ value, remove: () => onRemoveNationality(value) })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={chip.remove}
          className="flex items-center gap-1.5 rounded bg-accent py-0.5 pl-2 pr-1.5 text-xs text-accent-ink transition-opacity hover:opacity-85"
        >
          {chip.value}
          <span aria-hidden className="text-sm leading-none opacity-60">
            ×
          </span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}

      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink"
      >
        Clear filters
      </button>
    </div>
  );
}
