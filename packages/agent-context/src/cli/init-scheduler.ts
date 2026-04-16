#!/usr/bin/env node

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

import {confirm, select} from '@inquirer/prompts'

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    model: 'claude-sonnet-4-5',
    import: "import {anthropic} from '@ai-sdk/anthropic'",
    modelCall: "anthropic('claude-sonnet-4-5')",
    envVar: 'ANTHROPIC_API_KEY',
  },
  openai: {
    name: 'OpenAI',
    model: 'gpt-4o-mini',
    import: "import {openai} from '@ai-sdk/openai'",
    modelCall: "openai('gpt-4o-mini')",
    envVar: 'OPENAI_API_KEY',
  },
  google: {
    name: 'Google',
    model: 'gemini-1.5-flash',
    import: "import {google} from '@ai-sdk/google'",
    modelCall: "google('gemini-1.5-flash')",
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
  },
  other: {
    name: 'Other',
    model: 'your-model',
    import:
      "// TODO: Import your AI SDK provider\n// import {yourProvider} from '@ai-sdk/your-provider'",
    modelCall: "yourProvider('your-model') // TODO: Configure your model",
    envVar: 'YOUR_API_KEY',
  },
} as const

type ProviderKey = keyof typeof PROVIDERS

const FREQUENCIES = {
  '10min': {name: 'Every 10 minutes (recommended)', cron: '*/10 * * * *'},
  '30min': {name: 'Every 30 minutes', cron: '*/30 * * * *'},
  '1hr': {name: 'Every hour', cron: '0 * * * *'},
} as const

type FrequencyKey = keyof typeof FREQUENCIES

function generateBlueprintContent(cron: string, envVar: string): string {
  return `import {defineBlueprint, defineRobotToken, defineScheduledFunction} from '@sanity/blueprints'
import 'dotenv/config'

export default defineBlueprint({
  resources: [
    defineScheduledFunction({
      name: 'classify-conversations',
      timeout: 600,
      robotToken: '$.resources.classify-conversations-robot.token',
      env: {
        ${envVar}: process.env.${envVar},
      },
      event: {
        expression: '${cron}',
      },
    }),
    defineRobotToken({
      name: 'classify-conversations-robot',
      label: 'Classify Conversations Robot',
      memberships: [
        {
          resourceType: 'project',
          resourceId: '<your-project-id>',
          roleNames: ['editor'],
        },
      ],
    }),
  ],
})
`
}

function generateFunctionContent(provider: ProviderKey): string {
  const p = PROVIDERS[provider]

  return `import {createClient} from '@sanity/client'
import {
  classifyConversation,
  getConversationsToClassify,
  getPreviousContentGaps,
} from '@sanity/agent-context/primitives'
import {scheduledEventHandler} from '@sanity/functions'
${p.import}

// Number of concurrent classification requests.
const CONCURRENCY = 5

export const handler = scheduledEventHandler(async ({context}) => {
  if (!context.clientOptions?.token) {
    console.error('[classify-conversations] No client token available')
    return
  }

  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2026-01-01',
    useCdn: false,
  })

  const [conversations, previousContentGaps] = await Promise.all([
    getConversationsToClassify({client}),
    getPreviousContentGaps({client}),
  ])

  if (conversations.length === 0) {
    console.log('[classify-conversations] No conversations to classify')
    return
  }

  console.log(\`[classify-conversations] Found \${conversations.length} conversations to classify\`)

  let successCount = 0
  let errorCount = 0

  // Process in batches of CONCURRENCY
  for (let i = 0; i < conversations.length; i += CONCURRENCY) {
    const batch = conversations.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (conv) => {
        await classifyConversation({
          client,
          conversationId: conv._id,
          model: ${p.modelCall},
          messages: conv.messages,
          previousContentGaps,
        })
      }),
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        successCount++
      } else {
        errorCount++
        console.error(\`[classify-conversations] Failed to classify:\`, result.reason)
      }
    }
  }

  console.log(\`[classify-conversations] Completed: \${successCount} succeeded, \${errorCount} failed\`)
})
`
}

/** @internal */
async function main() {
  console.log('\n🔧 Setting up scheduled classification...\n')

  // Check if we're in a directory with a sanity.config
  const hasSanityConfig =
    existsSync('sanity.config.ts') ||
    existsSync('sanity.config.tsx') ||
    existsSync('sanity.config.js') ||
    existsSync('sanity.config.jsx') ||
    existsSync('sanity.config.mjs')

  if (!hasSanityConfig) {
    console.error('❌ No sanity.config found in current directory.')
    console.error('   Run this command from your Sanity Studio directory.\n')
    process.exit(1)
  }

  // Select AI provider
  const provider = await select<ProviderKey>({
    message: 'Which AI provider will you use for classification?',
    choices: [
      {value: 'anthropic', name: 'Anthropic (claude-sonnet-4-5 recommended)'},
      {value: 'openai', name: 'OpenAI (gpt-4o-mini)'},
      {value: 'google', name: 'Google (gemini-1.5-flash)'},
      {value: 'other', name: 'Other (manual configuration)'},
    ],
  })

  // Select frequency
  const frequencyChoice = await select<FrequencyKey>({
    message: 'How often should classification run?',
    choices: [
      {value: '10min', name: 'Every 10 minutes (recommended)'},
      {value: '30min', name: 'Every 30 minutes'},
      {value: '1hr', name: 'Every hour'},
    ],
  })

  const cron = FREQUENCIES[frequencyChoice].cron

  const p = PROVIDERS[provider]

  // Create files
  const functionsDir = 'functions'
  if (!existsSync(functionsDir)) {
    mkdirSync(functionsDir, {recursive: true})
  }

  // Write sanity.blueprint.ts
  if (await confirmOverwrite('sanity.blueprint.ts')) {
    writeFileSync('sanity.blueprint.ts', generateBlueprintContent(cron, p.envVar))
    console.log('✅ Created sanity.blueprint.ts')
  }

  // Write function file
  const functionDir = join(functionsDir, 'classify-conversations')
  if (!existsSync(functionDir)) {
    mkdirSync(functionDir, {recursive: true})
  }
  const functionPath = join(functionDir, 'index.ts')
  const functionExists = existsSync(functionPath)
  if (!functionExists || (await confirmOverwrite(functionPath))) {
    writeFileSync(functionPath, generateFunctionContent(provider))
    console.log(`✅ Created ${functionPath}`)
  }

  // Check and update package.json
  await updatePackageJson(provider)

  // Print next steps
  console.log('\n' + '─'.repeat(50))
  console.log('\n📋 Next steps:\n')
  console.log('  1. Install dependencies:')
  console.log('     pnpm install\n')
  console.log('  2. Update sanity.blueprint.ts:')
  console.log('     Replace <your-project-id> with your Sanity project ID\n')
  console.log('  3. Add your AI provider API key to .env:')
  console.log(`     ${p.envVar}=your-key-here\n`)
  console.log('  4. Configure blueprint stack:')
  console.log('     npx sanity blueprints doctor --fix\n')
  console.log('  5. Promote stack to organization scope (required for scheduled functions):')
  console.log('     npx sanity blueprints promote\n')
  console.log('  6. Test locally:')
  console.log('     npx sanity functions test classify-conversations --with-user-token\n')
  console.log('  7. Deploy:')
  console.log('     npx sanity blueprints deploy\n')

  if (provider === 'other') {
    console.log('  Note: Remember to configure your AI provider in')
    console.log(`        ${functionPath}\n`)
  }
}

async function confirmOverwrite(filename: string): Promise<boolean> {
  if (!existsSync(filename)) return true
  return confirm({
    message: `${filename} already exists. Overwrite?`,
    default: false,
  })
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

async function updatePackageJson(provider: ProviderKey) {
  const packageJsonPath = 'package.json'
  if (!existsSync(packageJsonPath)) {
    console.warn('⚠️  No package.json found. Skipping dependency updates.')
    return
  }

  let packageJson: PackageJson
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  } catch {
    console.error('❌ Failed to parse package.json. Is it valid JSON?')
    return
  }

  const deps = packageJson.dependencies ?? {}
  const devDeps = packageJson.devDependencies ?? {}

  const requiredDeps: Record<string, string> = {
    '@sanity/blueprints': '^0.15.0',
    '@sanity/functions': '^1.2.1',
    '@sanity/client': '^6',
  }

  // Add AI SDK provider if not 'other'
  if (provider !== 'other') {
    const sdkPackage = `@ai-sdk/${provider}`
    requiredDeps[sdkPackage] = '^1'
  }

  // Check what needs to be added
  const toAdd: Record<string, string> = {}
  for (const [pkg, version] of Object.entries(requiredDeps)) {
    if (!deps[pkg] && !devDeps[pkg]) {
      toAdd[pkg] = version
    }
  }

  if (Object.keys(toAdd).length === 0) {
    console.log('✅ Dependencies already present in package.json')
    return
  }

  console.log('\n📦 Adding dependencies to package.json:')
  for (const [pkg, version] of Object.entries(toAdd)) {
    console.log(`   ${pkg}@${version}`)
  }

  const updatedDeps = {...deps, ...toAdd}

  // Sort dependencies alphabetically
  packageJson.dependencies = Object.fromEntries(
    Object.entries(updatedDeps).sort(([a], [b]) => a.localeCompare(b)),
  )

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log('✅ Updated package.json')
}

export {main}
