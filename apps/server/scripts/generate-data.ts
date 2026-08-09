import { faker } from '@faker-js/faker'
import { writeFileSync } from 'node:fs'
import { CSV_FILE, CSV_HEADER, HOBBIES, HOBBY_SEPARATOR, NATIONALITIES } from './data-files.ts'

const USER_COUNT = 1000
const MAX_HOBBIES_PER_USER = 10

/** Age bounds for generated users. Kept as named constants so the range is stated in one place. */
const MIN_AGE = 16
const MAX_AGE = 90

/** First names with common prefixes for search testing. */
const FIRST_NAMES = [
    // "Mo" prefix (20 names)
    'Mohamed',
    'Mohan',
    'Mohit',
    'Morgan',
    'Monica',
    'Molly',
    'Morton',
    'Mortimer',
    'Morris',
    'Monroe',
    'Monique',
    'Moira',
    'Mona',
    'Moritz',
    'Mordecai',
    'Montague',
    'Montserrat',
    'Modesto',
    'Modena',
    'Moreno',

    // "Jo" prefix (20 names)
    'John',
    'Jonathan',
    'Joseph',
    'Joshua',
    'Joaquin',
    'Joanne',
    'Joanna',
    'Jocelyn',
    'Jody',
    'Joel',
    'Joellen',
    'Joelson',
    'Jolene',
    'Jonah',
    'Jonathon',
    'Jonny',
    'Jorgensen',
    'Joris',
    'Josey',
    'Jovan',

    // "Sa" prefix (20 names)
    'Samuel',
    'Sarah',
    'Sara',
    'Sadie',
    'Sally',
    'Samson',
    'Samantha',
    'Sage',
    'Sander',
    'Sandra',
    'Sanford',
    'Santino',
    'Santos',
    'Saul',
    'Saundra',
    'Savage',
    'Savanna',
    'Savasana',
    'Saveria',
    'Savina',

    // "St" prefix (20 names)
    'Steven',
    'Stephen',
    'Steve',
    'Stewart',
    'Stanley',
    'Stella',
    'Stephane',
    'Stephanie',
    'Stephania',
    'Steffen',
    'Stefanie',
    'Stefan',
    'Stefano',
    'Stefanell',
    'Stella',
    'Stephens',
    'Stew',
    'Stéphane',
    'Stephenie',
    'Stephon',

    // Other diverse names (20)
    'David',
    'Daniel',
    'Michael',
    'James',
    'Robert',
    'William',
    'Richard',
    'Joseph',
    'Thomas',
    'Charles',
    'Margaret',
    'Jennifer',
    'Mary',
    'Patricia',
    'Linda',
    'Barbara',
    'Elizabeth',
    'Susan',
    'Jessica',
    'Dorothy',
]

/** Last names with common prefixes for search testing. */
const LAST_NAMES = [
    // "Jo" prefix (20 names)
    'Johnson',
    'Jones',
    'Johansson',
    'Johansen',
    'Johanson',
    'Johannsen',
    'Johanns',
    'Johanis',
    'Joekel',
    'Johl',
    'Johnsen',
    'Johnstone',
    'Johny',
    'Johndrow',
    'Johnstad',
    'Johnsteen',
    'Johnsrud',
    'Johnstone',
    'Johnstun',
    'Johwell',

    // "Mu" prefix (20 names)
    'Murphy',
    'Murray',
    'Muller',
    'Mueller',
    'Muse',
    'Musselman',
    'Muth',
    'Mutchler',
    'Mull',
    'Mullan',
    'Mullane',
    'Mullen',
    'Mullens',
    'Mullin',
    'Mullins',
    'Mullis',
    'Mumm',
    'Munchel',
    'Munday',
    'Munsch',

    // "Mo" prefix (20 names)
    'Morgan',
    'Morrison',
    'Morris',
    'Morello',
    'Moretti',
    'Moran',
    'Morales',
    'Morar',
    'Moreau',
    'Morey',
    'Morford',
    'Morg',
    'Morgal',
    'Morhardt',
    'Mori',
    'Moriarty',
    'Morin',
    'Moring',
    'Mork',
    'Morlock',

    // "Mi" prefix (20 names)
    'Miller',
    'Mitchell',
    'Mills',
    'Milton',
    'Minter',
    'Minnick',
    'Minton',
    'Milne',
    'Milnor',
    'Milstead',
    'Milstead',
    'Milstead',
    'Milstein',
    'Milby',
    'Milcarek',
    'Miley',
    'Milford',
    'Milgram',
    'Mileham',
    'Milholland',

    // "Ma" prefix (20 names)
    'Martin',
    'Martinez',
    'Marshall',
    'Mason',
    'Manson',
    'Mathews',
    'Matthews',
    'Matheson',
    'Maxwell',
    'Maynard',
    'Maggio',
    'Magnavox',
    'Magnuson',
    'Mahabir',
    'Mahan',
    'Maher',
    'Mahoney',
    'Mahone',
    'Mahoney',
    'Mahmood',

    // "Sm" prefix (20 names)
    'Smith',
    'Schmidt',
    'Smit',
    'Smock',
    'Smola',
    'Smolinski',
    'Smolley',
    'Smalls',
    'Smallwood',
    'Smathurst',
    'Smathers',
    'Smathelson',
    'Smelcer',
    'Smele',
    'Smells',
    'Smelski',
    'Smelson',
    'Smelts',
    'Smeltzer',
    'Smelt',

    // "Sc" prefix (20 names)
    'Scott',
    'Schmidt',
    'Schneider',
    'Schubert',
    'Schultz',
    'Schulze',
    'Schumacher',
    'Schuman',
    'Schumann',
    'Schunk',
    'Schurman',
    'Schurz',
    'Schuster',
    'Schafer',
    'Schaefer',
    'Schaffner',
    'Schaffrath',
    'Schaghticoke',
    'Schalk',
    'Schall',

    // Other common (20)
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Rodriguez',
    'Taylor',
    'Anderson',
    'Thomas',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Harris',
    'Clark',
    'Lewis',
    'Robinson',
    'Walker',
    'Young',
    'Hernandez',
    'King',
]

/** Escape a single CSV field per RFC 4180. */
function escapeCsvField(value: string): string {
    return `"${value.replaceAll('"', '""')}"`
}

function generateUserRow(): string {
    const firstName = faker.helpers.arrayElement(FIRST_NAMES)
    const lastName = faker.helpers.arrayElement(LAST_NAMES)
    const nationalityCode = faker.helpers.arrayElement(NATIONALITIES).code

    const hobbies = faker.helpers.arrayElements(HOBBIES, {
        min: 0,
        max: MAX_HOBBIES_PER_USER,
    })

    const fields = [
        faker.string.uuid(),
        faker.image.avatar(),
        firstName,
        lastName,
        String(faker.number.int({ min: MIN_AGE, max: MAX_AGE })),
        nationalityCode,
        hobbies.join(HOBBY_SEPARATOR),
    ]

    return fields.map(escapeCsvField).join(',')
}

const rows = Array.from({ length: USER_COUNT }, generateUserRow)

writeFileSync(CSV_FILE, `${[CSV_HEADER.join(','), ...rows].join('\n')}\n`, 'utf8')

console.log(`Generated ${USER_COUNT} users -> ${CSV_FILE.pathname}`)
