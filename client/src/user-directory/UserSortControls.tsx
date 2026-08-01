import { SORT_DIRS, SORT_FIELDS, type SortDir, type SortField } from "@presight/shared";
import { useId } from "react";

/* The order the directory is read in, as two native selects.

   Two selects rather than a field dropdown beside a direction toggle: a toggle
   button whose label is the state it is *in* reads backwards to a screen
   reader — pressing "Ascending" gives you descending — and the direction is a
   value that round-trips through the URL like the field does, so offering it
   as one is the honest shape. Native `<select>` also arrives keyboard- and
   touch-complete rather than needing a listbox rebuilt from parts. */

/* Keyed by `SortField`, so the day a fifth field joins the contract this map
   is a type error naming the one thing left to decide — its label — rather
   than a dropdown quietly one option short. */
const SORT_FIELD_LABELS: Record<SortField, string> = {
  first_name: "First name",
  last_name: "Last name",
  age: "Age",
  nationality: "Nationality",
};

const SORT_DIR_LABELS: Record<SortDir, string> = {
  asc: "Ascending",
  desc: "Descending",
};

type UserSortControlsProps = {
  sort: SortField;
  dir: SortDir;
  onSortChange: (sort: SortField) => void;
  onDirChange: (dir: SortDir) => void;
};

const SELECT_CLASSES =
  "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-2 focus:outline-offset-2 focus:outline-slate-400";

const LABEL_CLASSES = "text-xs font-medium text-slate-500";

export const UserSortControls = ({
  sort,
  dir,
  onSortChange,
  onDirChange,
}: UserSortControlsProps) => {
  const sortFieldId = useId();
  const sortDirId = useId();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor={sortFieldId} className={LABEL_CLASSES}>
        Sort by
      </label>

      <select
        id={sortFieldId}
        value={sort}
        /* The cast is the boundary being crossed once, deliberately: the DOM
           types every option value as a bare string, and every option here
           comes from `SORT_FIELDS`. */
        onChange={(event) => onSortChange(event.target.value as SortField)}
        className={SELECT_CLASSES}
      >
        {SORT_FIELDS.map((sortField) => (
          <option key={sortField} value={sortField}>
            {SORT_FIELD_LABELS[sortField]}
          </option>
        ))}
      </select>

      <label htmlFor={sortDirId} className={`${LABEL_CLASSES} sr-only sm:not-sr-only`}>
        Direction
      </label>

      <select
        id={sortDirId}
        value={dir}
        onChange={(event) => onDirChange(event.target.value as SortDir)}
        className={SELECT_CLASSES}
      >
        {SORT_DIRS.map((sortDir) => (
          <option key={sortDir} value={sortDir}>
            {SORT_DIR_LABELS[sortDir]}
          </option>
        ))}
      </select>
    </div>
  );
};
