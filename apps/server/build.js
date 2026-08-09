import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))

await build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    platform: 'node',
    target: 'node26',
    format: 'esm',
    sourcemap: true,
    minify: process.env.NODE_ENV === 'production',
    logLevel: 'info',
    // Runtime deps stay external; devDependencies never end up in the output.
    external: Object.keys(pkg.dependencies ?? {}),
})
