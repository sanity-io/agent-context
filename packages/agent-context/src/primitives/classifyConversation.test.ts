import {describe, expect, it} from 'vitest'

import {formatMessagesForPrompt} from './classifyConversation'

describe('formatMessagesForPrompt', () => {
  it('formats messages with capitalized roles', () => {
    const messages = [
      {role: 'user', content: 'Hello'},
      {role: 'assistant', content: 'Hi there'},
    ]

    const result = formatMessagesForPrompt(messages)

    expect(result).toBe('[User]: Hello\n\n[Assistant]: Hi there')
  })

  it('handles empty content', () => {
    const messages = [{role: 'user', content: ''}]

    const result = formatMessagesForPrompt(messages)

    expect(result).toBe('[User]: (no content)')
  })

  it('handles all role types', () => {
    const messages = [
      {role: 'system', content: 'You are helpful'},
      {role: 'user', content: 'Hi'},
      {role: 'assistant', content: 'Hello'},
      {role: 'tool', content: 'Tool result'},
    ]

    const result = formatMessagesForPrompt(messages)

    expect(result).toContain('[System]:')
    expect(result).toContain('[User]:')
    expect(result).toContain('[Assistant]:')
    expect(result).toContain('[Tool]:')
  })

  it('returns empty string for empty array', () => {
    const result = formatMessagesForPrompt([])
    expect(result).toBe('')
  })
})
