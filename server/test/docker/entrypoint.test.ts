import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

/* The image's boot sequence, exercised the way the image runs it: a shell, an
   environment, and a command to hand over to. It lives in the server suite
   because the only thing it does before that hand-over is invoke this package's
   seed script at a pinned compiled path — `dist/db/seed.js`, relative to the
   image's WORKDIR — and a stub at exactly that path is what pins it. */
const ENTRYPOINT = join(import.meta.dirname, '..', '..', '..', 'docker', 'entrypoint.sh')

/* Stands in for the compiled seed. Writing the file the entrypoint decided was
   missing is the whole of what the real one does that the entrypoint can see. */
const STUB_SEED = `import { writeFileSync } from 'node:fs'
writeFileSync(process.env.DATABASE_PATH, 'seeded by the stub')
console.log('stub seed ran')
`

const FAILING_SEED = `console.error('seed failed: no')
process.exit(1)
`

type ImageRoot = {
  /** The WORKDIR the entrypoint runs in — `dist/db/seed.js` hangs off it. */
  root: string
  /** Inside a directory that does not exist yet, the way a fresh volume is. */
  dbPath: string
  remove: () => void
}

const createImageRoot = ({ seedFails = false } = {}): ImageRoot => {
  const root = mkdtempSync(join(tmpdir(), 'presight-entrypoint-'))

  mkdirSync(join(root, 'dist', 'db'), { recursive: true })
  writeFileSync(join(root, 'dist', 'db', 'seed.js'), seedFails ? FAILING_SEED : STUB_SEED)

  return {
    root,
    dbPath: join(root, 'data', 'presight.sqlite'),
    remove: () => rmSync(root, { recursive: true, force: true }),
  }
}

let image: ImageRoot | undefined

afterEach(() => {
  image?.remove()
  image = undefined
})

/* The command is a stand-in for `node dist/index.js`: what matters is that it
   runs at all, and only after the seed branch has finished. */
const boot = ({ root }: ImageRoot, env: Record<string, string>) =>
  spawnSync('sh', [ENTRYPOINT, process.execPath, '-e', "console.log('booted')"], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })

describe('the container entrypoint', () => {
  it('seeds a volume it finds empty, then hands over to the command', () => {
    image = createImageRoot()

    const result = boot(image, { DATABASE_PATH: image.dbPath, SEED_ON_BOOT: 'auto' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('stub seed ran')
    expect(result.stdout).toContain('seed complete')
    expect(result.stdout).toContain('booted')
    expect(readFileSync(image.dbPath, 'utf8')).toBe('seeded by the stub')
  })

  /* A fresh named volume mounts as an empty directory — and on `docker run`
     with no volume at all, not even that. */
  it('creates the directory the database lives in', () => {
    image = createImageRoot()
    expect(existsSync(dirname(image.dbPath))).toBe(false)

    boot(image, { DATABASE_PATH: image.dbPath, SEED_ON_BOOT: 'auto' })

    expect(existsSync(dirname(image.dbPath))).toBe(true)
  })

  /* The second `up`. CI greps the logs for this line, because "instant boot"
     and "booted empty" are otherwise the same observation. */
  it('skips the seed when the database is already there, and says so', () => {
    image = createImageRoot()
    mkdirSync(dirname(image.dbPath), { recursive: true })
    writeFileSync(image.dbPath, 'seeded weeks ago')

    const result = boot(image, { DATABASE_PATH: image.dbPath, SEED_ON_BOOT: 'auto' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('skipping seed')
    expect(result.stdout).not.toContain('stub seed ran')
    expect(result.stdout).toContain('booted')
    expect(readFileSync(image.dbPath, 'utf8')).toBe('seeded weeks ago')
  })

  it('defaults to auto when SEED_ON_BOOT is unset', () => {
    image = createImageRoot()

    const result = boot(image, { DATABASE_PATH: image.dbPath })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('stub seed ran')
  })

  /* A WAL left beside a dropped database is a partial dataset waiting to be
     replayed into the fresh one. */
  it('force drops the database and its WAL sidecars, then reseeds', () => {
    image = createImageRoot()
    mkdirSync(dirname(image.dbPath), { recursive: true })
    for (const path of [image.dbPath, `${image.dbPath}-wal`, `${image.dbPath}-shm`]) {
      writeFileSync(path, 'stale')
    }

    const result = boot(image, { DATABASE_PATH: image.dbPath, SEED_ON_BOOT: 'force' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('stub seed ran')
    expect(readFileSync(image.dbPath, 'utf8')).toBe('seeded by the stub')
    expect(existsSync(`${image.dbPath}-wal`)).toBe(false)
    expect(existsSync(`${image.dbPath}-shm`)).toBe(false)
  })

  /* Also the assertion that the missing-file check runs before anything opens
     the database: nothing in this path may bring the file into existence, or a
     later `auto` boot would see a seeded volume that was never seeded. */
  it('never seeds under never, and leaves the volume untouched doing it', () => {
    image = createImageRoot()

    const result = boot(image, { DATABASE_PATH: image.dbPath, SEED_ON_BOOT: 'never' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('skipping seed')
    expect(result.stdout).toContain('booted')
    expect(existsSync(image.dbPath)).toBe(false)
  })

  /* The same rule PORT and SEED_USER_COUNT follow. Falling through to `auto`
     would mean a typo'd `never` quietly reseeds a volume meant to be kept. */
  it('refuses a SEED_ON_BOOT it does not recognise, rather than assuming auto', () => {
    image = createImageRoot()

    const result = boot(image, { DATABASE_PATH: image.dbPath, SEED_ON_BOOT: 'forse' })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/SEED_ON_BOOT/)
    expect(result.stdout).not.toContain('booted')
    expect(existsSync(image.dbPath)).toBe(false)
  })

  /* The seed exits non-zero on failure precisely so this can happen: a server
     booted onto a database that was never filled answers 200 with an empty list,
     which is the failure mode that looks like success. */
  it('stops rather than booting onto a database the seed failed to fill', () => {
    image = createImageRoot({ seedFails: true })

    const result = boot(image, { DATABASE_PATH: image.dbPath, SEED_ON_BOOT: 'auto' })

    expect(result.status).not.toBe(0)
    expect(result.stdout).not.toContain('booted')
    expect(result.stdout).not.toContain('seed complete')
  })
})
