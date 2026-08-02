import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/* The client's features. The single source for the boundary rules below, so
   adding one is an edit here rather than an edit to every sibling's block. */
const FEATURES = ['user', 'facet-filter', 'search', 'sort']

// Feature-Driven Architecture's one load-bearing rule, made binding rather than
// agreed: a feature imports only its own subtree, `src/shared/`,
// `@presight/shared` and npm — never a sibling. Anything two features need is
// promoted to `src/shared/`, and that promotion is the whole mechanism.
//
// The patterns match the import *specifier*, which is always relative here
// because the project has no path aliases. A double-star around `/sort/`
// therefore catches `../sort/x` and `../../sort/x` alike, whatever depth the
// importer sits at, while leaving own-feature (`../hooks/x`), shared
// (`../../shared/x`) and bare specifiers untouched — none of those carry a
// sibling's name as a path segment. Colocated tests are covered too,
// deliberately: a test that reaches for a sibling is describing a cross-feature
// integration, which belongs outside the feature.
//
// Line comments rather than the block comments used elsewhere in this repo,
// because a glob of this shape contains `*` followed by `/` and would close a
// block comment on its way past.
const featureBoundaries = FEATURES.map((self) => ({
  files: [`src/feature/${self}/**/*.{ts,tsx}`],
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

/* The other direction, and the reason the rule above is not enough on its own:
   `shared/` reaching back down into a feature is the import cycle the layout
   exists to prevent. `app/` is deliberately unconstrained — composing the
   features is the whole of what it is for. */
const sharedIsALeaf = {
  files: ['src/shared/**/*.{ts,tsx}'],
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
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  ...featureBoundaries,
  sharedIsALeaf,
])
