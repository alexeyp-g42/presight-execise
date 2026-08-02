import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/* The server's features. The single source for the boundary rules below, so
   adding one is an edit here rather than an edit to every sibling's block. */
const FEATURES = ['user', 'avatar', 'health']

// A feature imports only its own subtree, `src/shared/`, `@presight/shared` and
// npm — never a sibling. Anything two features need is promoted to
// `src/shared/`, and that promotion is the whole mechanism. `CONTEXT.md` has
// the reasoning; this is the half that fails the build.
//
// The patterns match the import *specifier*, which is always relative here and
// carries a literal `.ts` (the type-stripped dev loop needs it). A double-star
// around `/user/` therefore catches `../user/lib/list-users.ts` at any depth,
// while leaving own-feature, `../../shared/...` and bare specifiers alone —
// none of those carry a sibling's name as a path segment. Colocated tests are
// covered too, deliberately: a test reaching for a sibling is a cross-feature
// integration test, and those stay in `server/test/`.
//
// Line comments rather than the block comments used elsewhere in this repo,
// because a glob of this shape contains `*` followed by `/` and would close a
// block comment on its way past.
const featureBoundaries = FEATURES.map((self) => ({
  files: [`src/feature/${self}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: FEATURES.filter((other) => other !== self).map((other) => `**/${other}/**`),
            message: 'A feature may not import a sibling. Promote the shared thing to src/shared/.',
          },
        ],
      },
    ],
  },
}))

/* The other direction: `shared/` reaching back down into a feature is the
   import cycle the layout exists to prevent. `app.ts` is deliberately
   unconstrained — mounting every feature's routes, in an order the file's own
   comments call contract, is the whole of what it is for. */
const sharedIsALeaf = {
  files: ['src/shared/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/feature/**'],
            message: 'src/shared/ may not depend on a feature — that is the cycle FDA prevents.',
          },
        ],
      },
    ],
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...featureBoundaries,
  sharedIsALeaf,
])
