/**
 * Multi-entry UI build script.
 *
 * Runs Vite once per widget entry to produce self-contained HTML files
 * using vite-plugin-singlefile. Output goes to dist/ directory.
 *
 * Each entry builds to a temp dir, then the output is renamed to
 * dist/{entry}.html (since Vite always outputs "index.html").
 */

import {build} from 'vite'
import {viteSingleFile} from 'vite-plugin-singlefile'
import react from '@vitejs/plugin-react'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {renameSync, mkdirSync, rmSync, existsSync} from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, 'dist')

// Ensure dist/ exists but don't clear compiled TS output from tsc
mkdirSync(distDir, {recursive: true})

const entries = ['product-grid', 'product-card', 'compare']

for (const entry of entries) {
  console.log(`Building ui/${entry}...`)

  const tempDir = resolve(__dirname, `.build-tmp-${entry}`)

  await build({
    configFile: false,
    plugins: [react(), viteSingleFile()],
    root: resolve(__dirname, `ui/${entry}`),
    build: {
      outDir: tempDir,
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, `ui/${entry}/index.html`),
      },
    },
    resolve: {
      alias: {
        '../shared': resolve(__dirname, 'ui/shared'),
      },
    },
    logLevel: 'warn',
  })

  // Rename index.html → dist/{entry}.html
  const src = resolve(tempDir, 'index.html')
  const dest = resolve(distDir, `${entry}.html`)
  renameSync(src, dest)

  // Clean up temp dir
  rmSync(tempDir, {recursive: true, force: true})

  console.log(`  → dist/${entry}.html`)
}

console.log('All UI bundles built.')
