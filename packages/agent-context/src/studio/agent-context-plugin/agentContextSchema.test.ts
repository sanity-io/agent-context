import {defineField} from 'sanity'
import {describe, expect, it} from 'vitest'

import {
  AGENT_CONTEXT_SCHEMA_TYPE_NAME,
  agentContextSchema,
  createAgentContextSchema,
} from './agentContextSchema'

describe('agentContextSchema', () => {
  it('should have the correct schema type name', () => {
    expect(agentContextSchema.name).toBe(AGENT_CONTEXT_SCHEMA_TYPE_NAME)
    expect(agentContextSchema.name).toBe('sanity.agentContext')
  })

  it('should be a document type', () => {
    expect(agentContextSchema.type).toBe('document')
  })

  describe('version field', () => {
    it('should correctly define the version field with type string and hidden: true', () => {
      const versionField = agentContextSchema.fields.find((field) => field.name === 'version')

      expect(versionField).toBeDefined()
      expect(versionField?.type).toBe('string')
      expect((versionField as {hidden?: boolean})?.hidden).toBe(true)
    })

    it("should include an initialValue of '1' for the version field", () => {
      expect(agentContextSchema.initialValue).toBeDefined()
      expect(agentContextSchema.initialValue).toHaveProperty('version', '1')
    })
  })

  describe('other fields', () => {
    it('should include the name field', () => {
      const nameField = agentContextSchema.fields.find((field) => field.name === 'name')
      expect(nameField).toBeDefined()
      expect(nameField?.type).toBe('string')
    })

    it('should include the slug field', () => {
      const slugField = agentContextSchema.fields.find((field) => field.name === 'slug')
      expect(slugField).toBeDefined()
      expect(slugField?.type).toBe('slug')
    })

    it('should include the groqFilter field', () => {
      const groqFilterField = agentContextSchema.fields.find((field) => field.name === 'groqFilter')
      expect(groqFilterField).toBeDefined()
      expect(groqFilterField?.type).toBe('string')
    })

    it('should include the instructions field', () => {
      const agentContextInstructionsField = agentContextSchema.fields.find(
        (field) => field.name === 'instructions',
      )
      expect(agentContextInstructionsField).toBeDefined()
      expect(agentContextInstructionsField?.type).toBe('text')
    })
  })
})

describe('createAgentContextSchema', () => {
  it('should return the default schema when called with no arguments', () => {
    const schema = createAgentContextSchema()
    expect(schema.name).toBe(AGENT_CONTEXT_SCHEMA_TYPE_NAME)
    expect(schema.fields).toHaveLength(agentContextSchema.fields.length)
  })

  it('should append extra fields after the built-in fields', () => {
    const extraField = defineField({name: 'brand', type: 'string', title: 'Brand'})
    const schema = createAgentContextSchema([extraField])

    expect(schema.fields).toHaveLength(agentContextSchema.fields.length + 1)

    const lastField = schema.fields[schema.fields.length - 1]
    expect(lastField?.name).toBe('brand')
    expect(lastField?.type).toBe('string')
  })

  it('should preserve all built-in fields when extra fields are provided', () => {
    const extraField = defineField({name: 'region', type: 'string', title: 'Region'})
    const schema = createAgentContextSchema([extraField])

    const builtInNames = ['version', 'name', 'slug', 'groqFilter', 'instructions']
    for (const name of builtInNames) {
      expect(schema.fields.find((f) => f.name === name)).toBeDefined()
    }
  })

  it('should support multiple extra fields', () => {
    const extraFields = [
      defineField({name: 'fieldA', type: 'string', title: 'Field A'}),
      defineField({name: 'fieldB', type: 'number', title: 'Field B'}),
    ]
    const schema = createAgentContextSchema(extraFields)

    expect(schema.fields).toHaveLength(agentContextSchema.fields.length + 2)
    expect(schema.fields.find((f) => f.name === 'fieldA')).toBeDefined()
    expect(schema.fields.find((f) => f.name === 'fieldB')).toBeDefined()
  })
})
