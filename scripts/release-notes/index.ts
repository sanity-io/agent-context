#!/usr/bin/env tsx
/**
 * Release Notes CLI
 *
 * Creates changelog documents in Sanity (sanity.io/changelog) when releases are published.
 *
 * Usage:
 *   pnpm release-notes preview 0.3.4        # Preview what would be created
 *   pnpm release-notes create 0.3.4        # Create documents (with confirmation)
 *   pnpm release-notes create 0.3.4 --yes  # Skip confirmation (used in CI)
 *   pnpm release-notes delete 0.3.4        # Delete documents (with confirmation)
 */

import {createInterface} from 'node:readline'

import {cac} from 'cac'
import chalk from 'chalk'
import {createChangelogDocuments, deleteChangelogDocuments} from './changelog'

function confirm(message: string): Promise<boolean> {
  const rl = createInterface({input: process.stdin, output: process.stdout})
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

const cli = cac('release-notes')

cli
  .command('preview <version>', 'Preview what would be created')
  .action(async (version: string) => {
    try {
      await createChangelogDocuments(version, {dryRun: true})
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('create <version>', 'Create changelog documents in Sanity')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (version: string, options: {yes?: boolean}) => {
    try {
      if (!options.yes) {
        const ok = await confirm(`Create changelog documents for v${version}?`)
        if (!ok) return
      }
      await createChangelogDocuments(version)
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('delete <version>', 'Delete changelog documents for a version')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (version: string, options: {yes?: boolean}) => {
    try {
      if (!options.yes) {
        const ok = await confirm(`Delete changelog documents for v${version}?`)
        if (!ok) return
      }
      await deleteChangelogDocuments(version)
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli.help()
cli.version('1.0.0')

cli.parse()
