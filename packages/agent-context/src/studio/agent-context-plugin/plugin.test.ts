import {describe, expect, it, vi} from 'vitest'

import {AGENT_CONTEXT_SCHEMA_TYPE_NAME} from './agentContextSchema'
import {AGENT_CONTEXT_DEFAULT_DOCUMENT_ID_PREFIX, agentContextPlugin} from './plugin'

// Mock @sanity/uuid to return predictable values
vi.mock('@sanity/uuid', () => ({
  uuid: () => 'test-uuid-12345',
}))

describe('agentContextPlugin', () => {
  it('should have the correct plugin name', () => {
    const plugin = agentContextPlugin()
    expect(plugin.name).toBe('sanity/agent-context/plugin')
  })

  it('should register the agent context schema type', () => {
    const plugin = agentContextPlugin()
    const types = plugin.schema?.types as {name: string}[] | undefined
    expect(types).toHaveLength(1)
    expect(types?.[0]).toHaveProperty('name', AGENT_CONTEXT_SCHEMA_TYPE_NAME)
  })

  describe('schema templates', () => {
    it('should add agent context template to the list', () => {
      const plugin = agentContextPlugin()
      const templateResolver = plugin.schema?.templates as
        | ((prev: {id: string}[]) => {id: string}[])
        | undefined
      const prevTemplates = [{id: 'other-template', schemaType: 'other', title: 'Other', value: {}}]

      const templates = templateResolver?.(prevTemplates)

      expect(templates).toHaveLength(2)
      expect(templates?.[0]?.id).toBe('other-template')
      expect(templates?.[1]?.id).toBe(AGENT_CONTEXT_SCHEMA_TYPE_NAME)
    })
  })

  describe('newDocumentOptions', () => {
    type MockTemplateItem = {
      templateId: string
      id: string
      type: 'initialValueTemplateItem'
      schemaType: string
      initialDocumentId?: string
    }

    const createMockTemplateItem = (templateId: string): MockTemplateItem => ({
      templateId,
      id: templateId,
      type: 'initialValueTemplateItem' as const,
      schemaType: templateId,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callResolver = (resolver: any, prevItems: MockTemplateItem[], creationContext: any) => {
      return resolver?.(prevItems, {creationContext}) as MockTemplateItem[] | undefined
    }

    it('should filter out agent context from global creation context', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.newDocumentOptions

      const prevItems = [
        createMockTemplateItem('article'),
        createMockTemplateItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME),
        createMockTemplateItem('product'),
      ]

      const result = callResolver(resolver, prevItems, {type: 'global'})

      expect(result).toHaveLength(2)
      expect(result?.map((item) => item.templateId)).toEqual(['article', 'product'])
    })

    it('should add prefixed initialDocumentId for structure creation context', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.newDocumentOptions

      const prevItems = [
        createMockTemplateItem('article'),
        createMockTemplateItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME),
      ]

      const result = callResolver(resolver, prevItems, {
        type: 'structure',
        schemaType: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
      })

      expect(result).toHaveLength(2)

      const articleItem = result?.find((item) => item.templateId === 'article')
      expect(articleItem).not.toHaveProperty('initialDocumentId')

      const agentContextItem = result?.find(
        (item) => item.templateId === AGENT_CONTEXT_SCHEMA_TYPE_NAME,
      )
      expect(agentContextItem?.initialDocumentId).toBe('sanity.agentContext.test-uuid-12345')
    })

    it('should add prefixed initialDocumentId for document creation context', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.newDocumentOptions

      const prevItems = [createMockTemplateItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME)]

      const result = callResolver(resolver, prevItems, {
        type: 'document',
        documentId: 'doc-123',
        schemaType: 'reference',
      })

      expect(result).toHaveLength(1)
      expect(result?.[0]?.initialDocumentId).toBe('sanity.agentContext.test-uuid-12345')
    })

    it('should not modify other template items', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.newDocumentOptions

      const prevItems = [createMockTemplateItem('article'), createMockTemplateItem('product')]

      const result = callResolver(resolver, prevItems, {
        type: 'structure',
        schemaType: 'article',
      })

      expect(result).toHaveLength(2)
      expect(result?.[0]).not.toHaveProperty('initialDocumentId')
      expect(result?.[1]).not.toHaveProperty('initialDocumentId')
    })

    it('should use the default sanity.agentContext. prefix for document IDs', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.newDocumentOptions

      const prevItems = [createMockTemplateItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME)]

      const result = callResolver(resolver, prevItems, {
        type: 'structure',
        schemaType: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
      })

      expect(result?.[0]?.initialDocumentId).toMatch(/^sanity\.agentContext\./)
    })

    it('should use a custom prefix when configured', () => {
      const plugin = agentContextPlugin({documentIdPrefix: 'agent'})
      const resolver = plugin.document?.newDocumentOptions

      const prevItems = [createMockTemplateItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME)]

      const result = callResolver(resolver, prevItems, {
        type: 'structure',
        schemaType: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
      })

      expect(result?.[0]?.initialDocumentId).toBe('agent.test-uuid-12345')
    })

    it('should not register newDocumentOptions when documentIdPrefix is null', () => {
      const plugin = agentContextPlugin({documentIdPrefix: null})
      const resolver = plugin.document?.newDocumentOptions

      expect(resolver).toBeUndefined()
    })
  })

  describe('document actions', () => {
    type MockAction = {
      action?: string
      displayName?: string;
      (props: unknown): unknown
    }

    const createMockAction = (action?: string): MockAction => {
      const fn = vi.fn() as unknown as MockAction
      fn.action = action
      return fn
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callActionsResolver = (resolver: any, prevActions: MockAction[], schemaType: string) => {
      return resolver?.(prevActions, {schemaType}) as MockAction[] | undefined
    }

    it('should replace the duplicate action for agent context type', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.actions

      const prevActions = [createMockAction('publish'), createMockAction('duplicate')]

      const result = callActionsResolver(resolver, prevActions, AGENT_CONTEXT_SCHEMA_TYPE_NAME)

      expect(result).toHaveLength(2)
      expect(result?.[0]?.action).toBe('publish')
      expect(result?.[1]?.action).toBe('duplicate')
      expect(result?.[1]?.displayName).toBe('AgentContextDuplicateAction')
    })

    it('should not modify actions for other schema types', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.actions

      const duplicateAction = createMockAction('duplicate')
      const prevActions = [createMockAction('publish'), duplicateAction]

      const result = callActionsResolver(resolver, prevActions, 'article')

      expect(result).toHaveLength(2)
      expect(result?.[1]).toBe(duplicateAction)
    })

    it('should preserve non-duplicate actions for agent context type', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.actions

      const publishAction = createMockAction('publish')
      const deleteAction = createMockAction('delete')
      const prevActions = [publishAction, createMockAction('duplicate'), deleteAction]

      const result = callActionsResolver(resolver, prevActions, AGENT_CONTEXT_SCHEMA_TYPE_NAME)

      expect(result).toHaveLength(3)
      expect(result?.[0]).toBe(publishAction)
      expect(result?.[2]).toBe(deleteAction)
    })

    it('should produce a duplicate action that uses the sanity.agentContext. prefix', () => {
      const plugin = agentContextPlugin()
      const resolver = plugin.document?.actions

      const prevActions = [createMockAction('duplicate')]

      const result = callActionsResolver(resolver, prevActions, AGENT_CONTEXT_SCHEMA_TYPE_NAME)

      const replacedAction = result?.[0]
      expect(replacedAction?.displayName).toBe('AgentContextDuplicateAction')
    })

    it('should not register actions when documentIdPrefix is null', () => {
      const plugin = agentContextPlugin({documentIdPrefix: null})
      const resolver = plugin.document?.actions

      expect(resolver).toBeUndefined()
    })
  })

  describe('plugin options', () => {
    it('should use the default prefix when no options are provided', () => {
      const plugin = agentContextPlugin()
      expect(plugin.name).toBe('sanity/agent-context/plugin')
    })

    it('should accept a custom documentIdPrefix', () => {
      const plugin = agentContextPlugin({documentIdPrefix: 'private'})
      expect(plugin.name).toBe('sanity/agent-context/plugin')
    })

    it('should accept null to disable prefixing', () => {
      const plugin = agentContextPlugin({documentIdPrefix: null})
      expect(plugin.name).toBe('sanity/agent-context/plugin')
    })

    it('should throw if documentIdPrefix is an empty string', () => {
      expect(() => agentContextPlugin({documentIdPrefix: ''})).toThrow(
        /\[@sanity\/agent-context\]: `documentIdPrefix` must be a non-empty string or null, but was ""/,
      )
    })
  })

  describe('AGENT_CONTEXT_DEFAULT_DOCUMENT_ID_PREFIX', () => {
    it('should be "sanity.agentContext"', () => {
      expect(AGENT_CONTEXT_DEFAULT_DOCUMENT_ID_PREFIX).toBe('sanity.agentContext')
    })

    it('should not be empty', () => {
      expect(AGENT_CONTEXT_DEFAULT_DOCUMENT_ID_PREFIX.length).toBeGreaterThan(0)
    })
  })
})
