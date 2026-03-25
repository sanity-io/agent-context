import {describe, expect, it} from 'vitest'

import {convertCustomMetricsForStorage, formatMessagesForPrompt} from './classifyConversation'

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

describe('convertCustomMetricsForStorage', () => {
  it('converts string values', () => {
    const metrics = {category: 'support'}

    const result = convertCustomMetricsForStorage(metrics)

    expect(result).toHaveLength(1)
    expect(result[0]?.key).toBe('category')
    expect(result[0]?.stringValue).toBe('support')
    expect(result[0]?.numberValue).toBeUndefined()
    expect(result[0]?.booleanValue).toBeUndefined()
  })

  it('converts number values', () => {
    const metrics = {score: 42}

    const result = convertCustomMetricsForStorage(metrics)

    expect(result).toHaveLength(1)
    expect(result[0]?.key).toBe('score')
    expect(result[0]?.numberValue).toBe(42)
    expect(result[0]?.stringValue).toBeUndefined()
    expect(result[0]?.booleanValue).toBeUndefined()
  })

  it('converts boolean values', () => {
    const metrics = {escalated: true}

    const result = convertCustomMetricsForStorage(metrics)

    expect(result).toHaveLength(1)
    expect(result[0]?.key).toBe('escalated')
    expect(result[0]?.booleanValue).toBe(true)
    expect(result[0]?.stringValue).toBeUndefined()
    expect(result[0]?.numberValue).toBeUndefined()
  })

  it('converts mixed types', () => {
    const metrics = {
      category: 'billing',
      priority: 5,
      urgent: false,
    }

    const result = convertCustomMetricsForStorage(metrics)

    expect(result).toHaveLength(3)

    const category = result.find((m) => m.key === 'category')!
    const priority = result.find((m) => m.key === 'priority')!
    const urgent = result.find((m) => m.key === 'urgent')!

    expect(category.stringValue).toBe('billing')
    expect(priority.numberValue).toBe(5)
    expect(urgent.booleanValue).toBe(false)
  })

  it('converts null/undefined to item without value', () => {
    const metrics = {empty: null, missing: undefined}

    const result = convertCustomMetricsForStorage(metrics)

    expect(result).toHaveLength(2)
    result.forEach((item) => {
      expect(item.stringValue).toBeUndefined()
      expect(item.numberValue).toBeUndefined()
      expect(item.booleanValue).toBeUndefined()
    })
  })

  it('generates unique _key for each item', () => {
    const metrics = {a: 1, b: 2, c: 3}

    const result = convertCustomMetricsForStorage(metrics)

    const keys = result.map((m) => m._key)
    const uniqueKeys = new Set(keys)

    expect(uniqueKeys.size).toBe(3)
  })

  it('stringifies objects and arrays as JSON', () => {
    const metrics = {
      data: {nested: 'value'},
      list: [1, 2, 3],
    }

    const result = convertCustomMetricsForStorage(metrics)

    const data = result.find((m) => m.key === 'data')
    const list = result.find((m) => m.key === 'list')

    expect(data?.stringValue).toBe('{"nested":"value"}')
    expect(list?.stringValue).toBe('[1,2,3]')
  })
})
