import {describe, expect, it, vi} from 'vitest'

import {getConversationsToClassify} from './getConversationsToClassify'

const createMockClient = (fetchResult: unknown = []) => ({
  fetch: vi.fn().mockResolvedValue(fetchResult),
})

describe('getConversationsToClassify', () => {
  it('fetches all conversations by default (no limit)', async () => {
    const mockClient = createMockClient([])

    await getConversationsToClassify({
      client: mockClient as never,
    })

    expect(mockClient.fetch).toHaveBeenCalledTimes(1)
    const [query, params] = mockClient.fetch.mock.calls[0] as [string, Record<string, unknown>]
    // No slice clause when no limit
    expect(query).not.toMatch(/\[0\.\.\.\d+\]/)
    expect(params['agentId']).toBeNull()
  })

  it('applies limit when provided', async () => {
    const mockClient = createMockClient([])

    await getConversationsToClassify({
      client: mockClient as never,
      limit: 50,
    })

    const [query] = mockClient.fetch.mock.calls[0] as [string]
    expect(query).toContain('[0...50]')
  })

  it('passes agentId filter to query', async () => {
    const mockClient = createMockClient([])

    await getConversationsToClassify({
      client: mockClient as never,
      agentId: 'support-bot',
    })

    const [, params] = mockClient.fetch.mock.calls[0] as [string, Record<string, unknown>]
    expect(params['agentId']).toBe('support-bot')
  })

  it('returns conversations from fetch result', async () => {
    const mockConversations = [
      {
        _id: 'conv-1',
        agentId: 'bot',
        threadId: 'thread-1',
        messages: [{role: 'user', content: 'Hello'}],
      },
      {
        _id: 'conv-2',
        agentId: 'bot',
        threadId: 'thread-2',
        messages: [{role: 'user', content: 'Hi'}],
      },
    ]
    const mockClient = createMockClient(mockConversations)

    const result = await getConversationsToClassify({
      client: mockClient as never,
    })

    expect(result).toEqual(mockConversations)
  })

  it('includes correct type in query params', async () => {
    const mockClient = createMockClient([])

    await getConversationsToClassify({
      client: mockClient as never,
    })

    const [, params] = mockClient.fetch.mock.calls[0] as [string, Record<string, unknown>]
    expect(params['type']).toBe('sanity.agentContextConversation')
  })

  it('query filters for unclassified or updated conversations', async () => {
    const mockClient = createMockClient([])

    await getConversationsToClassify({
      client: mockClient as never,
    })

    const [query] = mockClient.fetch.mock.calls[0] as [string]
    // Check that query includes the classification conditions
    expect(query).toContain('!defined(classifiedAt)')
    expect(query).toContain('_updatedAt > classifiedAt')
  })

  it('query orders by _updatedAt ascending', async () => {
    const mockClient = createMockClient([])

    await getConversationsToClassify({
      client: mockClient as never,
    })

    const [query] = mockClient.fetch.mock.calls[0] as [string]
    expect(query).toContain('order(_updatedAt asc)')
  })

  it('throws if limit is not a positive integer', async () => {
    const mockClient = createMockClient([])

    await expect(
      getConversationsToClassify({
        client: mockClient as never,
        limit: 0,
      }),
    ).rejects.toThrow('limit must be a positive integer')

    await expect(
      getConversationsToClassify({
        client: mockClient as never,
        limit: -5,
      }),
    ).rejects.toThrow('limit must be a positive integer')

    await expect(
      getConversationsToClassify({
        client: mockClient as never,
        limit: 3.5,
      }),
    ).rejects.toThrow('limit must be a positive integer')
  })
})
