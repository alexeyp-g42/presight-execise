import { allLocales, base, en, Faker } from '@faker-js/faker'
import { normalizeSearchText } from '../search/normalize-search-text.ts'
import { HOBBIES, NATIONALITIES } from './seed-vocabulary.ts'

/* 25,000 is chosen for *facet thinning*, not for looking large. The counts have
   to stay meaningful after two or three stacked selections, not merely
   globally: 10,000 flattens the deep-filter case into a wall of 1s, and
   100,000 pushes the seed into visible territory on the first `up`. */
export const DEFAULT_USER_COUNT = 25_000

/* Any fixed number would do. What matters is that it never changes, because it
   is the whole of "run the seed twice, get the identical dataset". */
const GENERATOR_SEED = 24_601

/* Zipf: rank *r* is weighted `1 / r^exponent`, so the vocabularies fall away as
   a long tail and a top-20 is a genuine truncation of one rather than an
   arbitrary slice of a flat distribution. An exponent of 1 is the classic
   curve; below 1 the tail fattens, which is what keeps the 20th-ranked value
   carrying a real count once two selections have already narrowed the set. */
const NATIONALITY_ZIPF_EXPONENT = 0.85
const HOBBY_ZIPF_EXPONENT = 0.8

/* Index *n* is the weight of having exactly *n* hobbies. The mass at 0 and at
   10 is deliberate and is the reason both card states exist in real data: 0
   renders the empty card, 10 renders the `+8` overflow. The bulge over 2-5 is
   what makes the rest of the directory look like people. */
const HOBBY_COUNT_WEIGHTS = [4, 9, 16, 18, 16, 13, 8, 5, 3, 2, 6]

const MIN_AGE = 18
const MAX_AGE = 75

/* Printable ASCII. `normalizeSearchText` folds every character the seeded
   locales systematically produce, so what reaches here is upstream noise rather
   than a letter — measured across the vocabulary it is one stray C1 control
   byte in ~90,000 draws, mojibake in faker's own data. Drawing again is the
   right answer for that; widening the fold map for one bad row is not. Five
   attempts is far more than that rate needs, and past them the English faker
   answers, so a locale that turned non-Latin upstream degrades instead of
   hanging. */
const ASCII_ONLY = /^[ -~]*$/
const MAX_NAME_ATTEMPTS = 5

export type GeneratedUser = {
  id: number
  first_name: string
  last_name: string
  age: number
  nationality: string
  search_name: string
}

export type GeneratedHobby = {
  user_id: number
  hobby: string
}

export type GeneratedDataset = {
  users: GeneratedUser[]
  hobbies: GeneratedHobby[]
}

const zipfWeights = (size: number, exponent: number): number[] =>
  Array.from({ length: size }, (_, index) => 1 / (index + 1) ** exponent)

/* Weighted sampling *without replacement*: `(user_id, hobby)` is a primary key,
   so a user cannot be handed the same hobby twice. Taken entries are skipped
   and their weight comes off the running total, which is why the weights array
   itself is never mutated and one copy serves every user.

   `fallback` covers the float arithmetic: with `remaining` accumulated by
   subtraction, a roll of 0.999… can land a hair past the last weight, and the
   last eligible index is the answer that walk was heading for anyway. */
const pickDistinct = (weights: number[], count: number, roll: () => number): number[] => {
  const picked: number[] = []
  const taken = new Set<number>()
  let remaining = weights.reduce((total, weight) => total + weight, 0)

  for (let n = 0; n < count; n++) {
    let target = roll() * remaining
    let chosen = -1
    let fallback = -1

    for (let index = 0; index < weights.length; index++) {
      if (taken.has(index)) continue
      fallback = index
      target -= weights[index]!
      if (target <= 0) {
        chosen = index
        break
      }
    }

    if (chosen === -1) chosen = fallback
    if (chosen === -1) break

    picked.push(chosen)
    taken.add(chosen)
    remaining -= weights[chosen]!
  }

  return picked
}

const pickOne = (weights: number[], roll: () => number): number =>
  pickDistinct(weights, 1, roll)[0] ?? 0

/* One Faker per nationality, each seeded distinctly so two locales do not walk
   their name lists in lockstep. They are built once and reused, because a
   Faker's determinism lives in the instance: rebuilding one per user would
   reset the stream and hand every Turkish user the same name. */
const localeFakers = (): { forNationality: Faker[]; english: Faker } => {
  const english = new Faker({ locale: [en, base] })
  english.seed(GENERATOR_SEED)

  const forNationality = NATIONALITIES.map((nationality, index) => {
    if (nationality.locale === null) {
      const fallback = new Faker({ locale: [en, base] })
      fallback.seed(GENERATOR_SEED + index + 1)
      return fallback
    }

    const faker = new Faker({ locale: [allLocales[nationality.locale], en, base] })
    faker.seed(GENERATOR_SEED + index + 1)
    return faker
  })

  return { forNationality, english }
}

const drawName = (faker: Faker, english: Faker): { first: string; last: string } => {
  for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
    const first = faker.person.firstName()
    const last = faker.person.lastName()
    if (ASCII_ONLY.test(normalizeSearchText(`${first} ${last}`))) return { first, last }
  }

  return { first: english.person.firstName(), last: english.person.lastName() }
}

/* The whole dataset, in memory, before a single row is written. 25,000 users
   and ~100,000 hobby rows is a few megabytes, and generating first keeps the
   write transaction as short as the disk allows. */
export const generateDataset = ({
  userCount = DEFAULT_USER_COUNT,
}: { userCount?: number } = {}): GeneratedDataset => {
  const chance = new Faker({ locale: [en, base] })
  chance.seed(GENERATOR_SEED)
  const roll = () => chance.number.float({ min: 0, max: 1 })

  const { forNationality, english } = localeFakers()
  const nationalityWeights = zipfWeights(NATIONALITIES.length, NATIONALITY_ZIPF_EXPONENT)
  const hobbyWeights = zipfWeights(HOBBIES.length, HOBBY_ZIPF_EXPONENT)

  const users: GeneratedUser[] = []
  const hobbies: GeneratedHobby[] = []

  for (let id = 1; id <= userCount; id++) {
    const nationalityIndex = pickOne(nationalityWeights, roll)
    const nationality = NATIONALITIES[nationalityIndex]!
    const { first, last } = drawName(forNationality[nationalityIndex]!, english)

    users.push({
      id,
      first_name: first,
      last_name: last,
      age: chance.number.int({ min: MIN_AGE, max: MAX_AGE }),
      nationality: nationality.name,
      /* First *and* last, because people type full names into a directory
         search box. #19 normalises the query term with the same function, so
         `LIKE '%ozcan%'` and `LIKE '%elif ozcan%'` both land. */
      search_name: normalizeSearchText(`${first} ${last}`),
    })

    const hobbyCount = pickOne(HOBBY_COUNT_WEIGHTS, roll)
    const chosen = pickDistinct(hobbyWeights, hobbyCount, roll).map((index) => HOBBIES[index]!)
    /* Alphabetical, which is the order `user_hobbies`' primary key stores them
       in — the rows go into the B-tree in the order it wants them. */
    for (const hobby of chosen.sort()) {
      hobbies.push({ user_id: id, hobby })
    }
  }

  return { users, hobbies }
}
