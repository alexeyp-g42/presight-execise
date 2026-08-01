import { useId } from "react";
import { DIRECTORY_CONTROL_SURFACE } from "./directoryControlSurface";
import { useDebouncedSearchDraft } from "./useDebouncedSearchDraft";

/* The search box, and deliberately nothing else: it is handed the committed
   search text — the URL's — and hands back a change once the viewer pauses.
   The draft it paints in between lives in the hook, so this file has no state
   of its own and the page has no timer of its own. */

type UserSearchInputProps = {
  /** The committed search text, read from the URL rather than from the draft. */
  searchText: string;
  onSearchTextChange: (searchText: string) => void;
};

const SEARCH_LABEL = "Search by name";

export const UserSearchInput = ({ searchText, onSearchTextChange }: UserSearchInputProps) => {
  const { draft, updateDraft } = useDebouncedSearchDraft({ searchText, onSearchTextChange });
  /* Generated rather than a constant: a label is tied to its input by id, and
     a hard-coded one breaks the moment a second search box exists. */
  const searchInputId = useId();

  /* `basis-48` is what makes the header wrap rather than crush: a search box
     cannot share a narrow row with the sort controls and still be readable, so
     it claims a width that does not fit beside them and takes its own line
     instead. `grow` then spends whatever the line has left. */
  return (
    <div className="min-w-0 grow basis-48 sm:max-w-xs">
      {/* A real label rather than a placeholder standing in for one — the
          placeholder disappears the moment there is text in the box. */}
      <label htmlFor={searchInputId} className="sr-only">
        {SEARCH_LABEL}
      </label>

      <input
        id={searchInputId}
        /* `type="search"` for the browser's own clear affordance, which comes
           through `onChange` like any other edit. */
        type="search"
        value={draft}
        onChange={(event) => updateDraft(event.target.value)}
        placeholder={SEARCH_LABEL}
        autoComplete="off"
        className={`${DIRECTORY_CONTROL_SURFACE} w-full px-3 placeholder:text-slate-400`}
      />
    </div>
  );
};
