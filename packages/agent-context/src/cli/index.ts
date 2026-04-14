#!/usr/bin/env node

import {main as initScheduler} from './init-scheduler'

const command = process.argv[2]

switch (command) {
  case 'init-insights-scheduler':
    initScheduler().catch((error) => {
      console.error('\n❌ Error:', error.message)
      process.exit(1)
    })
    break
  default:
    console.log('Usage: sanity-agent-context <command>\n')
    console.log('Commands:')
    console.log('  init-insights-scheduler   Scaffold scheduled conversation classification')
    process.exit(command ? 1 : 0)
}
