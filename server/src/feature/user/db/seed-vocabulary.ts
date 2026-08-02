import { allLocales } from '@faker-js/faker'

/* The two vocabularies the generated directory draws from. Both are ordered:
   index 0 is rank 1, and `seed-dataset.ts` weights them by rank, so the order
   below *is* the distribution. Reordering these lists changes the dataset. */

export type NationalityDefinition = {
  /** The display name stored on `users.nationality` — 'Germany', never 'DE'. */
  name: string
  /**
   * A `@faker-js/faker` locale key, or `null` to draw English names.
   *
   * Latin script only, deliberately. The directory's whole point is a search
   * box, and a name in a script the viewer cannot type is a row they can never
   * reach — so the countries listed here are ones a Latin-alphabet directory
   * would plausibly render natively, and the rest fall back to English rather
   * than arriving as kana or Cyrillic.
   */
  locale: keyof typeof allLocales | null
}

/* Ranked by how much of the directory each should occupy, not alphabetically.
   The diacritic-heavy locales sit high on purpose: Turkey, Poland, Vietnam and
   the Nordics are what put `Özcan`, `Łukasz` and `Bjørn` in front of the
   normalisation at scale rather than in a planted row. */
export const NATIONALITIES: NationalityDefinition[] = [
  { name: 'United States', locale: 'en_US' },
  { name: 'India', locale: 'en_IN' },
  { name: 'Germany', locale: 'de' },
  { name: 'Brazil', locale: 'pt_BR' },
  { name: 'United Kingdom', locale: 'en_GB' },
  { name: 'Turkey', locale: 'tr' },
  { name: 'France', locale: 'fr' },
  { name: 'Poland', locale: 'pl' },
  { name: 'Nigeria', locale: 'en_NG' },
  { name: 'Spain', locale: 'es' },
  { name: 'Mexico', locale: 'es_MX' },
  { name: 'Italy', locale: 'it' },
  { name: 'Vietnam', locale: 'vi' },
  { name: 'Canada', locale: 'en_CA' },
  { name: 'Indonesia', locale: 'id_ID' },
  { name: 'Netherlands', locale: 'nl' },
  { name: 'Romania', locale: 'ro' },
  { name: 'Australia', locale: 'en_AU' },
  { name: 'Czechia', locale: 'cs_CZ' },
  { name: 'Sweden', locale: 'sv' },
  { name: 'Portugal', locale: 'pt_PT' },
  { name: 'Hungary', locale: 'hu' },
  { name: 'Croatia', locale: 'hr' },
  { name: 'Denmark', locale: 'da' },
  { name: 'Norway', locale: 'nb_NO' },
  { name: 'Finland', locale: 'fi' },
  { name: 'Argentina', locale: 'es' },
  { name: 'Belgium', locale: 'nl_BE' },
  { name: 'Austria', locale: 'de_AT' },
  { name: 'Switzerland', locale: 'de_CH' },
  { name: 'Ireland', locale: 'en_IE' },
  { name: 'South Africa', locale: 'en_ZA' },
  { name: 'Serbia', locale: 'sr_RS_latin' },
  { name: 'Slovakia', locale: 'sk' },
  { name: 'Slovenia', locale: 'sl_SI' },
  { name: 'Latvia', locale: 'lv' },
  { name: 'Azerbaijan', locale: 'az' },
  { name: 'Ghana', locale: 'en_GH' },
  { name: 'Senegal', locale: 'fr_SN' },
  { name: 'Uzbekistan', locale: 'uz_UZ_latin' },
  { name: 'Colombia', locale: 'es' },
  { name: 'Chile', locale: 'es' },
  { name: 'Peru', locale: 'es' },
  /* Anglophone or English-drawing, so the fallback below is not a stand-in for
     a locale faker happens to be missing — it is the right answer for them. */
  { name: 'Philippines', locale: null },
  { name: 'Kenya', locale: null },
  { name: 'New Zealand', locale: null },
  { name: 'Singapore', locale: null },
  { name: 'Malaysia', locale: null },
  { name: 'Jamaica', locale: null },
  { name: 'Ethiopia', locale: null },
]

/* Free text, stored verbatim in `user_hobbies` — there is no hobby dimension
   table to keep these in step with. Ranked like the nationalities: `reading` is
   the one nearly everybody has, `parkour` the one that survives in the tail. */
export const HOBBIES: string[] = [
  'reading',
  'cooking',
  'hiking',
  'photography',
  'running',
  'gardening',
  'cycling',
  'travel',
  'music',
  'gaming',
  'swimming',
  'painting',
  'yoga',
  'chess',
  'writing',
  'baking',
  'fishing',
  'dancing',
  'camping',
  'drawing',
  'football',
  'knitting',
  'woodworking',
  'birdwatching',
  'climbing',
  'pottery',
  'guitar',
  'skiing',
  'surfing',
  'tennis',
  'astronomy',
  'calligraphy',
  'sewing',
  'basketball',
  'volunteering',
  'podcasting',
  'board games',
  'archery',
  'sailing',
  'kayaking',
  'scuba diving',
  'bouldering',
  'martial arts',
  'meditation',
  'beekeeping',
  'brewing',
  'wine tasting',
  'origami',
  'karaoke',
  'bowling',
  'golf',
  'badminton',
  'table tennis',
  'horse riding',
  'ice skating',
  'snowboarding',
  'geocaching',
  'metal detecting',
  'stamp collecting',
  'model trains',
  'puzzles',
  'sudoku',
  'poetry',
  'blogging',
  'filmmaking',
  'animation',
  '3d printing',
  'electronics',
  'robotics',
  'drone flying',
  'rowing',
  'triathlon',
  'boxing',
  'fencing',
  'rugby',
  'cricket',
  'baseball',
  'skateboarding',
  'rollerblading',
  'parkour',
]
