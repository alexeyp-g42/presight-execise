import { normalizeSearchText } from '../../src/feature/user/lib/normalize-search-text.ts'
import type { Db } from '../../src/shared/db/open-db.ts'
import { user_hobbies, users } from '../../src/shared/db/schema.ts'

/* Sixty people, written out by hand rather than drawn from the generator, so
   the expected result of every filter in the suite is a short list of ids a
   reader can check against the table below. The generator's 25,000 rows would
   force every expectation to be computed the same way the endpoint computes it,
   which proves only that the two agree.
 *
 * Every row here earns its place. Read the block comments as a spec:
 * `directory-fixture.test.ts` asserts each of these properties still holds, so
 * an edit that quietly removes the last 10-hobby user fails the suite.
 *
 * `search_name` is *not* written out — it is derived below through the same
 * `normalizeSearchText()` the seed uses, because a hand-typed normalisation
 * would be a second implementation of the thing under test. */

export type FixtureUser = {
  id: number
  first_name: string
  last_name: string
  age: number
  nationality: string
  hobbies: string[]
}

/* Two values that would be destroyed by comma-joining a multi-value selection,
   which is why selections travel as repeated keys. Both are named here so the
   round-trip tests and the fixture cannot drift apart. */
export const NATIONALITY_WITH_COMMA = 'Korea, Republic of'
export const HOBBY_WITH_COMMA = 'photography, film'
export const HOBBY_WITH_SPACE = 'board games'

export const DIRECTORY: FixtureUser[] = [
  /* Germany — one of two nationalities held by several people, so an ANY-of
     selection has something to widen over. Felix Braun holds no hobbies at all
     (the empty card), and Zoë Neumann carries a diaeresis NFD decomposes. */
  { id: 1, first_name: 'Lukas', last_name: 'Müller', age: 34, nationality: 'Germany', hobbies: ['chess', 'hiking'] },
  { id: 2, first_name: 'Anna', last_name: 'Schmidt', age: 41, nationality: 'Germany', hobbies: ['baking', 'reading'] },
  { id: 3, first_name: 'Jonas', last_name: 'Weber', age: 29, nationality: 'Germany', hobbies: ['chess', 'cycling', 'hiking'] },
  { id: 4, first_name: 'Greta', last_name: 'Hoffmann', age: 34, nationality: 'Germany', hobbies: ['gardening'] },
  { id: 5, first_name: 'Felix', last_name: 'Braun', age: 52, nationality: 'Germany', hobbies: [] },
  { id: 6, first_name: 'Zoë', last_name: 'Neumann', age: 27, nationality: 'Germany', hobbies: ['painting', 'reading'] },

  /* Turkey — the other multi-person nationality, and where the accent-insensitive
     search earns its keep: `ozcan` has to find Özcan and `yilmaz` has to find
     Yılmaz, whose dotless ı survives NFD untouched. */
  { id: 7, first_name: 'Elif', last_name: 'Özcan', age: 34, nationality: 'Turkey', hobbies: ['archery', 'chess', 'hiking'] },
  { id: 8, first_name: 'Mert', last_name: 'Yılmaz', age: 45, nationality: 'Turkey', hobbies: ['swimming'] },
  { id: 9, first_name: 'Ayşe', last_name: 'Demir', age: 38, nationality: 'Turkey', hobbies: ['chess', 'yoga'] },
  { id: 10, first_name: 'Deniz', last_name: 'Kaya', age: 41, nationality: 'Turkey', hobbies: [HOBBY_WITH_SPACE, 'chess'] },
  { id: 11, first_name: 'Emre', last_name: 'Şahin', age: 23, nationality: 'Turkey', hobbies: ['guitar', 'running'] },

  /* Norway — Bjørn's ø is a single indivisible code point, so it reaches the
     fold map rather than the diacritic strip. `Halvorsen` is also the surname
     no first name shares a substring with: the proof that last names are
     searched at all. */
  { id: 12, first_name: 'Bjørn', last_name: 'Halvorsen', age: 47, nationality: 'Norway', hobbies: ['sailing', 'skiing'] },
  { id: 13, first_name: 'Ingrid', last_name: 'Solberg', age: 34, nationality: 'Norway', hobbies: ['hiking', 'running', 'skiing'] },
  { id: 14, first_name: 'Ole', last_name: 'Nordvik', age: 61, nationality: 'Norway', hobbies: ['sailing'] },

  /* Netherlands — lowercase surname particles, which sort after every
     capitalised name under SQLite's BINARY collation. */
  { id: 15, first_name: 'Sanne', last_name: 'van Dijk', age: 30, nationality: 'Netherlands', hobbies: [HOBBY_WITH_SPACE, 'cycling'] },
  { id: 16, first_name: 'Daan', last_name: 'Bakker', age: 41, nationality: 'Netherlands', hobbies: ['chess', 'cycling', 'swimming'] },
  { id: 17, first_name: 'Femke', last_name: 'de Vries', age: 36, nationality: 'Netherlands', hobbies: ['pottery'] },

  /* A display name carrying a comma *and* a space. Comma-joining a selection
     would split this into "Korea" and "Republic of", neither of which matches
     anything — silently, and only for this one country. */
  { id: 18, first_name: 'Ji-woo', last_name: 'Park', age: 28, nationality: NATIONALITY_WITH_COMMA, hobbies: ['calligraphy', 'chess'] },
  { id: 19, first_name: 'Min-jun', last_name: 'Kim', age: 33, nationality: NATIONALITY_WITH_COMMA, hobbies: [HOBBY_WITH_SPACE, 'judo'] },

  { id: 20, first_name: 'Łukasz', last_name: 'Kowalski', age: 39, nationality: 'Poland', hobbies: ['chess', 'woodworking'] },
  { id: 21, first_name: 'Zofia', last_name: 'Nowak', age: 26, nationality: 'Poland', hobbies: ['knitting', 'reading'] },

  { id: 22, first_name: 'Marta', last_name: 'Silva', age: 34, nationality: 'Brazil', hobbies: ['running', 'surfing'] },
  { id: 23, first_name: 'Rafael', last_name: 'Costa', age: 44, nationality: 'Brazil', hobbies: ['surfing', 'swimming'] },

  { id: 24, first_name: 'Camille', last_name: 'Dubois', age: 31, nationality: 'France', hobbies: [HOBBY_WITH_COMMA] },
  { id: 25, first_name: 'Jeanne', last_name: 'Moreau', age: 55, nationality: 'France', hobbies: ['painting', 'reading'] },

  /* Mixed-case surnames — an interior capital and an apostrophe, both of which
     have to survive normalisation as themselves. */
  { id: 26, first_name: 'Aoife', last_name: 'MacDonald', age: 37, nationality: 'Ireland', hobbies: ['hiking', 'reading'] },
  { id: 27, first_name: 'Niamh', last_name: "O'Brien", age: 41, nationality: 'Ireland', hobbies: ['guitar', 'knitting'] },

  { id: 28, first_name: 'Lucía', last_name: 'Fernández', age: 29, nationality: 'Spain', hobbies: ['guitar', 'travel'] },
  { id: 29, first_name: 'Pablo', last_name: 'Ruiz', age: 48, nationality: 'Spain', hobbies: ['chess', 'guitar'] },

  /* `marc` matches Marcus by first name and Marchetti (id 35) by last name —
     one term, both columns, in a single assertion. */
  { id: 30, first_name: 'Grace', last_name: 'Fisher', age: 34, nationality: 'United States', hobbies: [HOBBY_WITH_SPACE, 'chess', 'hiking', 'reading'] },
  { id: 31, first_name: 'Marcus', last_name: 'Bell', age: 58, nationality: 'United States', hobbies: ['birdwatching', HOBBY_WITH_COMMA] },
  { id: 32, first_name: 'Harper', last_name: 'Nguyen', age: 22, nationality: 'United States', hobbies: ['origami', 'reading'] },

  { id: 33, first_name: 'Olivia', last_name: 'Whitmore', age: 35, nationality: 'United Kingdom', hobbies: ['reading', 'travel'] },
  { id: 34, first_name: 'Theo', last_name: 'Ashcombe', age: 42, nationality: 'United Kingdom', hobbies: ['chess', 'sailing'] },

  /* From here down, one person per nationality — the long tail that takes the
     fixture past twenty distinct values in both dimensions. */
  { id: 35, first_name: 'Luca', last_name: 'Marchetti', age: 34, nationality: 'Italy', hobbies: ['cycling', 'guitar'] },
  { id: 36, first_name: 'Elsa', last_name: 'Lindqvist', age: 33, nationality: 'Sweden', hobbies: ['skiing', 'yoga'] },
  { id: 37, first_name: 'Mads', last_name: 'Jensen', age: 50, nationality: 'Denmark', hobbies: ['sailing', 'woodworking'] },
  { id: 38, first_name: 'Yuki', last_name: 'Nakamura', age: 27, nationality: 'Japan', hobbies: ['origami', HOBBY_WITH_COMMA] },
  { id: 39, first_name: 'Priya', last_name: 'Nair', age: 32, nationality: 'India', hobbies: ['reading', 'yoga'] },
  { id: 40, first_name: 'Chidi', last_name: 'Okonkwo', age: 43, nationality: 'Nigeria', hobbies: ['running', 'travel'] },
  { id: 41, first_name: 'Ama', last_name: 'Mensah', age: 25, nationality: 'Ghana', hobbies: ['baking', 'calligraphy'] },
  { id: 42, first_name: 'Tiago', last_name: 'Ferreira', age: 46, nationality: 'Portugal', hobbies: ['surfing', 'travel'] },
  { id: 43, first_name: 'Linh', last_name: 'Tran', age: 24, nationality: 'Vietnam', hobbies: [HOBBY_WITH_SPACE, 'origami'] },
  { id: 44, first_name: 'Sofía', last_name: 'Ramírez', age: 41, nationality: 'Mexico', hobbies: ['pottery', 'travel'] },
  { id: 45, first_name: 'Owen', last_name: 'Tremblay', age: 34, nationality: 'Canada', hobbies: ['hiking', 'skiing'] },
  { id: 46, first_name: 'Katrín', last_name: 'Jónsdóttir', age: 37, nationality: 'Iceland', hobbies: ['hiking', 'swimming'] },
  /* Schwa, which NFD leaves whole and the fold map turns into `e`. */
  { id: 47, first_name: 'Ələkbər', last_name: 'Məmmədov', age: 40, nationality: 'Azerbaijan', hobbies: ['chess', 'judo'] },
  { id: 48, first_name: 'Petra', last_name: 'Nováková', age: 28, nationality: 'Czechia', hobbies: ['knitting', 'painting'] },
  { id: 49, first_name: 'Aino', last_name: 'Virtanen', age: 51, nationality: 'Finland', hobbies: ['birdwatching', 'sailing'] },
  { id: 50, first_name: 'Nikos', last_name: 'Papadopoulos', age: 36, nationality: 'Greece', hobbies: ['chess', 'swimming'] },
  { id: 51, first_name: 'Eszter', last_name: 'Nagy', age: 30, nationality: 'Hungary', hobbies: ['pottery', 'yoga'] },
  { id: 52, first_name: 'Jack', last_name: 'Fletcher', age: 29, nationality: 'Australia', hobbies: ['surfing', 'travel'] },
  { id: 53, first_name: 'Valentina', last_name: 'Gómez', age: 39, nationality: 'Argentina', hobbies: ['guitar', 'running'] },
  { id: 54, first_name: 'Ivan', last_name: 'Horvat', age: 44, nationality: 'Croatia', hobbies: ['chess', 'hiking'] },
  { id: 55, first_name: 'Nina', last_name: 'Steiner', age: 33, nationality: 'Switzerland', hobbies: ['skiing', 'yoga'] },
  { id: 56, first_name: 'Lotte', last_name: 'Peeters', age: 26, nationality: 'Belgium', hobbies: ['baking', 'cycling'] },
  { id: 57, first_name: 'Jakob', last_name: 'Gruber', age: 49, nationality: 'Austria', hobbies: ['hiking', 'skiing'] },
  { id: 58, first_name: 'Ruby', last_name: 'Sinclair', age: 31, nationality: 'New Zealand', hobbies: ['birdwatching', 'sailing'] },
  { id: 59, first_name: 'Thandi', last_name: 'Mokoena', age: 35, nationality: 'South Africa', hobbies: ['running', 'swimming'] },

  /* Ten hobbies, the maximum the data model allows — the `+n` overflow card,
     and the row that proves the endpoint returns the *full* array rather than
     the two the card shows. */
  {
    id: 60,
    first_name: 'Amara',
    last_name: 'Osei',
    age: 34,
    nationality: 'Kenya',
    hobbies: [
      'archery',
      'baking',
      HOBBY_WITH_SPACE,
      'chess',
      'cycling',
      'gardening',
      'hiking',
      'reading',
      'travel',
      'yoga',
    ],
  },
]

/* Handed to `createTestServer({ seed })`, so it runs against the same handle the
   app is built with. 60 users at 6 bound parameters and ~140 hobby rows at 2
   are both far under SQLite's 32,766-parameter ceiling, so neither needs the
   chunking the real seed does. */
export const seedDirectoryFixture = (db: Db): void => {
  db.insert(users)
    .values(
      DIRECTORY.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        age: user.age,
        nationality: user.nationality,
        search_name: normalizeSearchText(`${user.first_name} ${user.last_name}`),
      })),
    )
    .run()

  db.insert(user_hobbies)
    .values(DIRECTORY.flatMap(({ id, hobbies }) => hobbies.map((hobby) => ({ user_id: id, hobby }))))
    .run()
}
