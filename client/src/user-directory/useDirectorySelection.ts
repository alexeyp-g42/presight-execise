import { parseAsNativeArrayOf, parseAsString, useQueryState } from "nuqs";
import { useCallback } from "react";

/* The viewer's selections, in the shared URL beside the search text and the
   sort — and in exactly the shape the API accepts, so there is no translation
   layer between what they can paste to a colleague and what the client sends.

   **Repeated keys**, via nuqs' *native* array parser: `?hobbies=chess&hobbies=judo`,
   which is the same string `buildUserFilterParams` produces. The comma-joining
   parser was never an option — nationality display names contain commas
   ("Korea, Republic of"), so joining would split one selection into two that
   match nothing, and only for some data.

   `push`, like the sort controls and unlike typing: picking a value off the
   sidebar is a discrete deliberate act, so back undoes exactly that one
   selection — and lands on a query key already in the cache, which repaints
   without a request. */

/* Already carries `.withDefault([])` from the parser itself, and with it an
   element-wise `eq` — which is what makes emptying a selection *remove* the
   key rather than leave `?hobbies=` behind, since nuqs clears a key whose value
   equals the default. Built once at module scope so that default is one
   array rather than a fresh one per render. */
const selectionParser = parseAsNativeArrayOf(parseAsString).withOptions({ history: "push" });

export type DirectorySelectionResult = {
  /** ALL-of — a user must have every value, so selecting more narrows. */
  hobbies: string[];
  /** ANY-of — a user must have one of the values, so selecting more widens. */
  nationalities: string[];
  /** Adds the value if it is absent, removes it if it is there. */
  toggleHobby: (hobby: string) => void;
  toggleNationality: (nationality: string) => void;
  /** Empties **both** dimensions. The search text is not a selection and is left alone. */
  clearSelections: () => void;
};

const toggled = (selection: string[], value: string): string[] =>
  selection.includes(value)
    ? selection.filter((selected) => selected !== value)
    : /* Appended rather than inserted in order: the URL then reads in the order
         the viewer picked, and the sidebar sorts its own display anyway. */
      [...selection, value];

export const useDirectorySelection = (): DirectorySelectionResult => {
  const [hobbies, setHobbies] = useQueryState("hobbies", selectionParser);
  const [nationalities, setNationalities] = useQueryState("nationalities", selectionParser);

  /* The updater form rather than closing over the array above: a toggle fired
     from an event handler that rendered a moment ago would otherwise write a
     selection computed from a stale one. */
  const toggleHobby = useCallback(
    (hobby: string) => {
      void setHobbies((current) => toggled(current, hobby));
    },
    [setHobbies],
  );

  const toggleNationality = useCallback(
    (nationality: string) => {
      void setNationalities((current) => toggled(current, nationality));
    },
    [setNationalities],
  );

  /* `null` rather than `[]`: nuqs removes a key whose value equals the parser's
     default, and the default here *is* the empty array — so both spellings clear
     the selection, and `null` says which of the two is meant.

     One act rather than two, and the URL agrees: nuqs batches the writes it
     receives in a tick into a single update, so both keys leave together, one
     history entry is pushed, and back restores the whole selection the viewer
     was stuck in rather than half of it. */
  const clearSelections = useCallback(() => {
    void setHobbies(null);
    void setNationalities(null);
  }, [setHobbies, setNationalities]);

  return { hobbies, nationalities, toggleHobby, toggleNationality, clearSelections };
};
