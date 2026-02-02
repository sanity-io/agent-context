import {describe, expect, it} from 'vitest'

import {isSimpleTypeQuery, listToQuery, queryToList, validateGroq} from './groqUtils'

describe('groqUtils', () => {
  describe('listToQuery', () => {
    it('should convert a list of types to a GROQ query', () => {
      expect(listToQuery(['author'])).toBe('_type in ["author"]')
      expect(listToQuery(['author', 'book'])).toBe('_type in ["author", "book"]')
    })

    it('should return empty brackets for empty list', () => {
      expect(listToQuery([])).toBe('_type in []')
    })
  })

  describe('queryToList', () => {
    it('should parse types from a GROQ query', () => {
      expect(queryToList('_type in ["author"]')).toEqual(['author'])
      expect(queryToList('_type in ["author", "book"]')).toEqual(['author', 'book'])
    })

    it('should handle queries with extra whitespace', () => {
      expect(queryToList('_type  in  ["author" , "book"]')).toEqual(['author', 'book'])
    })

    it('should return empty array for non-matching queries', () => {
      expect(queryToList('_type == "author"')).toEqual([])
      expect(queryToList('')).toEqual([])
    })
  })

  describe('isSimpleTypeQuery', () => {
    it('should return true for simple _type in [...] queries', () => {
      expect(isSimpleTypeQuery('_type in ["author"]')).toBe(true)
      expect(isSimpleTypeQuery('_type in ["author", "book"]')).toBe(true)
      expect(isSimpleTypeQuery('_type in []')).toBe(true)
    })

    it('should return true for undefined/empty queries', () => {
      expect(isSimpleTypeQuery(undefined)).toBe(true)
      expect(isSimpleTypeQuery('')).toBe(true)
    })

    it('should return false for complex queries', () => {
      expect(isSimpleTypeQuery('_type in ["author"] && published')).toBe(false)
      expect(isSimpleTypeQuery('_type == "author"')).toBe(false)
      expect(isSimpleTypeQuery('*[_type in ["author"]]')).toBe(false)
    })
  })

  describe('validateGroq', () => {
    it('should return valid for correct GROQ syntax', () => {
      expect(validateGroq('_type in ["author"]')).toEqual({valid: true})
      expect(validateGroq('_type == "author" && published')).toEqual({valid: true})
    })

    it('should return valid for undefined/empty queries', () => {
      expect(validateGroq(undefined)).toEqual({valid: true})
      expect(validateGroq('')).toEqual({valid: true})
    })

    it('should return invalid with error for bad GROQ syntax', () => {
      const result = validateGroq('_type in ["author"')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
