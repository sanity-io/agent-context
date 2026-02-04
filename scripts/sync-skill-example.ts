#!/usr/bin/env tsx
/**
 * Syncs the ecommerce example to the skill's references folder.
 *
 * This script copies the full examples/ecommerce/ directory to
 * skills/create-agent-with-sanity-context/references/ecommerce/,
 * excluding files that match .gitignore patterns.
 *
 * Run manually: pnpm sync-skill-example
 * Runs automatically: via CI when ecommerce files are merged to main
 */

import {cpSync, existsSync, mkdirSync, readdirSync, rmSync} from 'fs'
import {join, relative} from 'path'

const SOURCE = 'examples/ecommerce'
const DEST = 'skills/create-agent-with-sanity-context/references/ecommerce'

// Patterns to always exclude (beyond .gitignore)
const ALWAYS_EXCLUDE = [
  'node_modules',
  '.next',
  '.sanity',
  'dist',
  '.git',
  '.DS_Store',
  '*.log',
  '*.tsbuildinfo',
  '.env',
  '.env.local',
  '.env.*.local',
  '*.local',
  'coverage',
  'logs',
  '.pnp',
  '.pnp.js',
  '*.pem',
  // Human-facing docs (skill uses _index.md for agent navigation)
  'README.md',
]

/**
 * Check if a path should be excluded based on patterns
 */
function shouldExclude(relativePath: string, name: string): boolean {
  for (const pattern of ALWAYS_EXCLUDE) {
    // Exact match
    if (pattern === name) return true

    // Glob pattern (*.ext)
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1)
      if (name.endsWith(ext)) return true
    }

    // Path contains pattern
    if (relativePath.includes(`/${pattern}/`) || relativePath.startsWith(`${pattern}/`)) {
      return true
    }
  }

  return false
}

/**
 * Recursively copy directory, excluding patterns
 */
function copyDir(src: string, dest: string, baseDir: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, {recursive: true})
  }

  const entries = readdirSync(src, {withFileTypes: true})

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    const relativePath = relative(baseDir, srcPath)

    if (shouldExclude(relativePath, entry.name)) {
      continue
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, baseDir)
    } else {
      cpSync(srcPath, destPath)
    }
  }
}

function main(): void {
  console.log(`Syncing ${SOURCE} -> ${DEST}`)

  // Verify source exists
  if (!existsSync(SOURCE)) {
    console.error(`Source directory not found: ${SOURCE}`)
    process.exit(1)
  }

  // Clean destination
  if (existsSync(DEST)) {
    console.log('Cleaning existing destination...')
    rmSync(DEST, {recursive: true, force: true})
  }

  // Create destination
  mkdirSync(DEST, {recursive: true})

  // Copy files (includes _index.md from source)
  console.log('Copying files...')
  copyDir(SOURCE, DEST, SOURCE)

  // Count files
  const countFiles = (dir: string): number => {
    let count = 0
    const entries = readdirSync(dir, {withFileTypes: true})
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFiles(join(dir, entry.name))
      } else {
        count++
      }
    }
    return count
  }

  const fileCount = countFiles(DEST)
  console.log(`Done! Synced ${fileCount} files.`)
}

main()
