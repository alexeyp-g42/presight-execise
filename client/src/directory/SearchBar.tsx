import { useEffect, useState } from 'react';

interface Props {
  value: string;
  onChange: (next: string) => void;
}

/**
 * The debounce lives here rather than in the query layer, so the input stays
 * fully responsive while the URL and the network lag behind it.
 */
export function SearchBar({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value);

  // Adopt changes that came from elsewhere — back/forward, clear filters —
  // without fighting the person typing.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <label className="block">
      <span className="sr-only">Search names</span>
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search names"
        autoComplete="off"
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-faint hover:border-faint focus:border-accent"
      />
    </label>
  );
}
