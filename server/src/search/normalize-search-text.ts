/* NFD splits a precomposed letter into base + combining mark, so stripping the
   marks turns `é` into `e` and `Ş` into `S`. It does nothing for letters that
   are a single indivisible code point — `ø` is not `o` plus a stroke — and
   those are what this map is for.

   Every entry is a letter the seed's own locales actually produce, which is the
   bar for adding another: `ı` and `ə` earn their place because Turkish and
   Azerbaijani names are full of them, and without them those rows would sit in
   the directory unsearchable. Anything upstream emits that this map does not
   cover is redrawn by the seed rather than stored — see `seed-dataset.ts`. */
const FOLD_MAP: Record<string, string> = {
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ß: 'ss',
  æ: 'ae',
  ı: 'i',
  ə: 'e',
}

const FOLDABLE = new RegExp(`[${Object.keys(FOLD_MAP).join('')}]`, 'gu')

/* The one place a name becomes searchable text, run at seed time (#18) and
   again on the query term (#19). Same function both sides, so the stored column
   and the term matched against it cannot drift.

   It exists because SQLite folds ASCII only: `LIKE` and `COLLATE NOCASE` leave
   `Ö` and `o` as different characters, so `ozcan` would never find Özcan. */
export const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    /* After lowercasing, so the map needs lowercase keys only. */
    .replace(FOLDABLE, (letter) => FOLD_MAP[letter] ?? letter)
