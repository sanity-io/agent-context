#!/usr/bin/env node

const command = process.argv[2]

switch (command) {
  case 'init-insights-scheduler':
    import('./init-scheduler')
    break
  default:
    console.log('Usage: sanity-agent-context <command>\n')
    console.log('Commands:')
    console.log('  init-insights-scheduler   Scaffold scheduled conversation classification')
    process.exit(command ? 1 : 0)
}
