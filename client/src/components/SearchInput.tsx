interface SearchInputProps {
  value: string
  onChange(value: string): void
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search by first or last name"
      aria-label="Search by first or last name"
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
    />
  )
}
