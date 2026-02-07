import {describe, expect, it} from 'vitest'

import {createAgentContextDuplicateAction} from './AgentContextDuplicateAction'

describe('createAgentContextDuplicateAction', () => {
  it('should create a duplicate action component', () => {
    const action = createAgentContextDuplicateAction('context')
    expect(action).toBeDefined()
    expect(typeof action).toBe('function')
  })

  it('should set the action property to "duplicate"', () => {
    const action = createAgentContextDuplicateAction('context')
    expect(action.action).toBe('duplicate')
  })

  it('should set the displayName to "AgentContextDuplicateAction"', () => {
    const action = createAgentContextDuplicateAction('context')
    expect(action.displayName).toBe('AgentContextDuplicateAction')
  })

  it('should work with different prefixes', () => {
    const action1 = createAgentContextDuplicateAction('context')
    const action2 = createAgentContextDuplicateAction('private')
    const action3 = createAgentContextDuplicateAction('agent')

    // All should be valid action components
    expect(action1.action).toBe('duplicate')
    expect(action2.action).toBe('duplicate')
    expect(action3.action).toBe('duplicate')
  })
})
