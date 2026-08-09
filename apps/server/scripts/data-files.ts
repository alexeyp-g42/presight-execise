import { env } from '../src/env.ts'

/** Shared locations/format of the generated seed data. */

/** CSV seed file, kept at the server package root. */
export const CSV_FILE = new URL('../user_data.csv', import.meta.url)

/** Package root, so `DATABASE_FILE` can stay a path relative to it (as in `.env.example`). */
const PACKAGE_ROOT = new URL('../', import.meta.url)

/** SQLite database built from the CSV, at the path configured by `DATABASE_FILE` (see `env.ts`). */
export const DB_FILE = new URL(env.databaseFile, PACKAGE_ROOT)
export const DB_DIR = new URL('.', DB_FILE)

export const CSV_HEADER = ['id', 'avatar', 'first_name', 'last_name', 'age', 'nationality_code', 'hobbies'] as const

/** Hobbies are a multi-value column, joined with this separator inside one CSV field. */
export const HOBBY_SEPARATOR = '|'

/** Reference list of hobbies. Seeded in full into the `hobbies` table. */
export const HOBBIES = [
    'Reading',
    'Writing',
    'Painting',
    'Photography',
    'Cooking',
    'Baking',
    'Gardening',
    'Hiking',
    'Cycling',
    'Running',
    'Swimming',
    'Yoga',
    'Chess',
    'Gaming',
    'Guitar',
    'Piano',
    'Singing',
    'Dancing',
    'Woodworking',
    'Pottery',
    'Knitting',
    'Fishing',
    'Camping',
    'Traveling',
    'Birdwatching',
    'Astronomy',
    'Calligraphy',
    'Origami',
    'Surfing',
    'Skiing',
]

/** Reference list of nationalities (ISO 3166-1 alpha-2 code -> display label). Seeded in full into the `nationalities` table. */
export const NATIONALITIES: ReadonlyArray<{ code: string; label: string }> = [
    { code: 'in', label: 'India' },
    { code: 'us', label: 'United States' },
    { code: 'gb', label: 'United Kingdom' },
    { code: 'ca', label: 'Canada' },
    { code: 'au', label: 'Australia' },
    { code: 'de', label: 'Germany' },
    { code: 'fr', label: 'France' },
    { code: 'es', label: 'Spain' },
    { code: 'it', label: 'Italy' },
    { code: 'nl', label: 'Netherlands' },
    { code: 'se', label: 'Sweden' },
    { code: 'no', label: 'Norway' },
    { code: 'dk', label: 'Denmark' },
    { code: 'fi', label: 'Finland' },
    { code: 'pl', label: 'Poland' },
    { code: 'pt', label: 'Portugal' },
    { code: 'ie', label: 'Ireland' },
    { code: 'ch', label: 'Switzerland' },
    { code: 'at', label: 'Austria' },
    { code: 'be', label: 'Belgium' },
    { code: 'gr', label: 'Greece' },
    { code: 'tr', label: 'Turkey' },
    { code: 'ru', label: 'Russia' },
    { code: 'cn', label: 'China' },
    { code: 'jp', label: 'Japan' },
    { code: 'kr', label: 'South Korea' },
    { code: 'sg', label: 'Singapore' },
    { code: 'my', label: 'Malaysia' },
    { code: 'th', label: 'Thailand' },
    { code: 'vn', label: 'Vietnam' },
    { code: 'ph', label: 'Philippines' },
    { code: 'id', label: 'Indonesia' },
    { code: 'pk', label: 'Pakistan' },
    { code: 'bd', label: 'Bangladesh' },
    { code: 'lk', label: 'Sri Lanka' },
    { code: 'ae', label: 'United Arab Emirates' },
    { code: 'sa', label: 'Saudi Arabia' },
    { code: 'il', label: 'Israel' },
    { code: 'eg', label: 'Egypt' },
    { code: 'za', label: 'South Africa' },
    { code: 'ng', label: 'Nigeria' },
    { code: 'ke', label: 'Kenya' },
    { code: 'br', label: 'Brazil' },
    { code: 'mx', label: 'Mexico' },
    { code: 'ar', label: 'Argentina' },
    { code: 'cl', label: 'Chile' },
    { code: 'co', label: 'Colombia' },
    { code: 'pe', label: 'Peru' },
    { code: 'nz', label: 'New Zealand' },
    { code: 'ua', label: 'Ukraine' },
    { code: 'cz', label: 'Czech Republic' },
]
