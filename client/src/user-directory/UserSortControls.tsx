import { SORT_DIRS, SORT_FIELDS, type SortDir, type SortField } from "@presight/shared";
import { useId } from "react";
import { DIRECTORY_CONTROL_LABEL, DIRECTORY_CONTROL_SURFACE } from "./directoryControlSurface";

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

/* Exported so the test can build props from the same type the component takes,
   rather than restating them — and declared here, above the component, per
   `CLAUDE.md`. */
export type UserSortControlsProps = {
  sort: SortField;
  dir: SortDir;
  onSortChange: (sort: SortField) => void;
  onDirChange: (dir: SortDir) => void;
};

const SELECT_CLASSES = `${DIRECTORY_CONTROL_SURFACE} px-2`;

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
      <label htmlFor={sortFieldId} className={DIRECTORY_CONTROL_LABEL}>
        Sort by
      </label>

      <select
        id={sortFieldId}
        value={sort}
        /* The cast is a deliberate boundary crossing, and it is safe for a
           reason visible three lines below: the DOM types every option value as
           a bare string, and every option this select has comes from
           `SORT_FIELDS`. The same holds for the direction select. */
        onChange={(event) => onSortChange(event.target.value as SortField)}
        className={SELECT_CLASSES}
      >
        {SORT_FIELDS.map((sortField) => (
          <option key={sortField} value={sortField}>
            {SORT_FIELD_LABELS[sortField]}
          </option>
        ))}
      </select>

      <label htmlFor={sortDirId} className={`${DIRECTORY_CONTROL_LABEL} sr-only sm:not-sr-only`}>
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
