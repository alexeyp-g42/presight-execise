import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/* A stand-in for `client/dist`, written by hand rather than by running Vite.
   What the server actually depends on is the layout — an unhashed `index.html`
   naming a content-hashed bundle under `assets/` — and a fixture that says so
   in four lines is a better statement of the contract than a bundler run that
   takes seconds and asserts nothing. */

export const SHELL_MARKER = '<div id="root"></div>'

/** The path a hashed bundle takes in a URL, which is what makes it immutable. */
export const BUNDLE_URL = '/assets/index-abc12345.js'

export type ClientBuild = {
  /** What `createApp` is pointed at through `clientDir`. */
  dir: string
  remove: () => void
}

export const createClientBuild = (): ClientBuild => {
  const dir = mkdtempSync(join(tmpdir(), 'presight-client-'))

  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, `.${BUNDLE_URL}`), 'console.log("the client")\n')
  writeFileSync(join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  writeFileSync(
    join(dir, 'index.html'),
    `<!doctype html><html><body>${SHELL_MARKER}<script type="module" src="${BUNDLE_URL}"></script></body></html>`,
  )

  return { dir, remove: () => rmSync(dir, { recursive: true, force: true }) }
}
