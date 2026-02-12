'use client'

import {Check, ChevronDown, X} from 'lucide-react'
import {useRouter, useSearchParams} from 'next/navigation'
import {useCallback, useMemo, useRef, useState, useTransition} from 'react'

import {type ProductFiltersInput} from '@/lib/client-tools'
import {SORT_OPTIONS} from '@/sanity/queries/products'

import type {FILTER_OPTIONS_QUERY_RESULT} from '../../sanity.types'
import {Button} from './ui/button'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './ui/select'

interface FilterBarProps {
  filterOptions: FILTER_OPTIONS_QUERY_RESULT
}

/** Parse URL param to array */
function getArrayParam(searchParams: URLSearchParams, key: string): string[] {
  const values = searchParams.getAll(key)
  return values.length > 0 ? values : []
}

export function FilterBar(props: FilterBarProps) {
  const {filterOptions} = props
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Read current filters from URL (multi-value filters are arrays)
  const currentFilters = useMemo<ProductFiltersInput>(() => {
    const sortParam = searchParams.get('sort')
    const validSort = SORT_OPTIONS.find((s) => s.value === sortParam)
    return {
      category: getArrayParam(searchParams, 'category'),
      color: getArrayParam(searchParams, 'color'),
      size: getArrayParam(searchParams, 'size'),
      brand: getArrayParam(searchParams, 'brand'),
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      sort: validSort?.value,
    }
  }, [searchParams])

  // Normalize empty arrays to undefined for easier checks
  const normalizeArray = (arr: string[] | undefined): string[] | undefined =>
    arr && arr.length > 0 ? arr : undefined

  // Update URL with new filters
  const updateFilters = useCallback(
    (updates: Partial<ProductFiltersInput>) => {
      const params = new URLSearchParams()

      // Preserve non-updated params
      const currentCategory = normalizeArray(currentFilters.category)
      const currentColor = normalizeArray(currentFilters.color)
      const currentSize = normalizeArray(currentFilters.size)
      const currentBrand = normalizeArray(currentFilters.brand)

      // Helper to set array params
      const setArrayParam = (key: string, values: string[] | undefined) => {
        if (values?.length) {
          values.forEach((v) => params.append(key, v))
        }
      }

      // Apply category
      const newCategory = 'category' in updates ? normalizeArray(updates.category) : currentCategory
      setArrayParam('category', newCategory)

      // Apply color
      const newColor = 'color' in updates ? normalizeArray(updates.color) : currentColor
      setArrayParam('color', newColor)

      // Apply size
      const newSize = 'size' in updates ? normalizeArray(updates.size) : currentSize
      setArrayParam('size', newSize)

      // Apply brand
      const newBrand = 'brand' in updates ? normalizeArray(updates.brand) : currentBrand
      setArrayParam('brand', newBrand)

      // Apply single-value params
      const newMinPrice = 'minPrice' in updates ? updates.minPrice : currentFilters.minPrice
      if (newMinPrice !== undefined) params.set('minPrice', String(newMinPrice))

      const newMaxPrice = 'maxPrice' in updates ? updates.maxPrice : currentFilters.maxPrice
      if (newMaxPrice !== undefined) params.set('maxPrice', String(newMaxPrice))

      const newSort = 'sort' in updates ? updates.sort : currentFilters.sort
      if (newSort) params.set('sort', newSort)

      startTransition(() => {
        const query = params.toString()
        router.push(query ? `/products?${query}` : '/products', {scroll: false})
      })
    },
    [router, currentFilters],
  )

  // Toggle a value in an array filter
  const toggleArrayFilter = useCallback(
    (key: 'category' | 'color' | 'size' | 'brand', value: string) => {
      const current = currentFilters[key] || []
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      updateFilters({[key]: newValues})
    },
    [currentFilters, updateFilters],
  )

  // Clear a single filter
  const clearFilter = useCallback(
    (key: keyof ProductFiltersInput, value?: string) => {
      const filterValue = currentFilters[key]
      if (value && Array.isArray(filterValue)) {
        // Remove single value from array
        updateFilters({[key]: filterValue.filter((v) => v !== value)})
      } else {
        // Clear entire filter
        updateFilters({[key]: undefined})
      }
    },
    [currentFilters, updateFilters],
  )

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      router.push('/products', {scroll: false})
    })
  }, [router])

  // Generate price range options
  const priceRanges = generatePriceRanges(filterOptions.priceRange)

  // Build active filter chips (individual items for arrays)
  const activeFilters = buildActiveFilters(currentFilters, filterOptions, priceRanges)

  return (
    <div className={`space-y-3 ${isPending ? 'pointer-events-none opacity-70' : ''}`}>
      {/* Filter dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category - Multi-select */}
        <MultiSelectDropdown
          label="Category"
          selected={currentFilters.category || []}
          options={filterOptions.categories
            .filter((cat) => cat.slug)
            .map((cat) => ({value: cat.slug!, label: cat.title || cat.slug!}))}
          onToggle={(value) => toggleArrayFilter('category', value)}
        />

        {/* Color - Multi-select */}
        <MultiSelectDropdown
          label="Color"
          selected={currentFilters.color || []}
          options={filterOptions.colors
            .filter((color) => color.slug)
            .map((color) => ({
              value: color.slug!,
              label: color.title || color.slug!,
              color: color.hexValue || undefined,
            }))}
          onToggle={(value) => toggleArrayFilter('color', value)}
        />

        {/* Size - Multi-select */}
        <MultiSelectDropdown
          label="Size"
          selected={currentFilters.size || []}
          options={filterOptions.sizes
            .filter((size) => size.code)
            .map((size) => ({value: size.code!, label: size.code!}))}
          onToggle={(value) => toggleArrayFilter('size', value)}
          width="w-[120px]"
        />

        {/* Brand - Multi-select */}
        <MultiSelectDropdown
          label="Brand"
          selected={currentFilters.brand || []}
          options={filterOptions.brands
            .filter((brand) => brand.slug)
            .map((brand) => ({value: brand.slug!, label: brand.title || brand.slug!}))}
          onToggle={(value) => toggleArrayFilter('brand', value)}
        />

        {/* Price - Single select */}
        <Select
          value={currentFilters.maxPrice?.toString() || ''}
          onValueChange={(value) => updateFilters({maxPrice: value ? Number(value) : undefined})}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Price" />
          </SelectTrigger>

          <SelectContent>
            {priceRanges.map((range) => (
              <SelectItem key={range.value} value={range.value.toString()}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort - Single select */}
        <Select
          value={currentFilters.sort || ''}
          onValueChange={(value) => {
            const validSort = SORT_OPTIONS.find((s) => s.value === value)
            updateFilters({sort: validSort?.value})
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>

          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <button
              key={`${filter.key}-${filter.value || 'all'}`}
              type="button"
              onClick={() => clearFilter(filter.key, filter.value)}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 transition-colors hover:bg-neutral-200"
            >
              {filter.label}

              <X className="h-3.5 w-3.5" />
            </button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-neutral-500 hover:text-neutral-700"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

// Multi-select dropdown component
interface MultiSelectOption {
  value: string
  label: string
  color?: string
}

interface MultiSelectDropdownProps {
  label: string
  selected: string[]
  options: MultiSelectOption[]
  onToggle: (value: string) => void
  width?: string
}

function MultiSelectDropdown(props: MultiSelectDropdownProps) {
  const {label, selected, options, onToggle, width = 'w-[150px]'} = props
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayText = selected.length > 0 ? `${label} (${selected.length})` : label

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 ${width} items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2`}
      >
        <span className={selected.length > 0 ? 'text-neutral-900' : 'text-neutral-500'}>
          {displayText}
        </span>

        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute left-0 top-full z-50 mt-1 max-h-60 min-w-[180px] overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((option) => {
              const isSelected = selected.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onToggle(option.value)
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'}`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>

                  {option.color && (
                    <span
                      className="h-3 w-3 rounded-full border border-neutral-300"
                      style={{backgroundColor: option.color}}
                    />
                  )}

                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

interface ActiveFilter {
  key: keyof ProductFiltersInput
  value?: string // For array filters, the specific value
  label: string
}

function buildActiveFilters(
  filters: ProductFiltersInput,
  options: FILTER_OPTIONS_QUERY_RESULT,
  priceRanges: Array<{value: number; label: string}>,
): ActiveFilter[] {
  const active: ActiveFilter[] = []

  // Category chips (one per selected category)
  filters.category?.forEach((slug) => {
    const cat = options.categories.find((c) => c.slug === slug)
    if (cat?.title) active.push({key: 'category', value: slug, label: cat.title})
  })

  // Color chips
  filters.color?.forEach((slug) => {
    const color = options.colors.find((c) => c.slug === slug)
    if (color?.title) active.push({key: 'color', value: slug, label: color.title})
  })

  // Size chips
  filters.size?.forEach((code) => {
    const size = options.sizes.find((s) => s.code === code)
    if (size?.code) active.push({key: 'size', value: code, label: `Size ${size.code}`})
  })

  // Brand chips
  filters.brand?.forEach((slug) => {
    const brand = options.brands.find((b) => b.slug === slug)
    if (brand?.title) active.push({key: 'brand', value: slug, label: brand.title})
  })

  // Price chip
  if (filters.maxPrice) {
    const range = priceRanges.find((r) => r.value === filters.maxPrice)
    active.push({key: 'maxPrice', label: range?.label || `Under $${filters.maxPrice}`})
  }

  // Sort chip
  if (filters.sort) {
    const sortOption = SORT_OPTIONS.find((s) => s.value === filters.sort)
    if (sortOption) active.push({key: 'sort', label: sortOption.label})
  }

  return active
}

function generatePriceRanges(priceRange: FILTER_OPTIONS_QUERY_RESULT['priceRange']): Array<{
  value: number
  label: string
}> {
  const max = priceRange.max ?? 500
  const thresholds = [50, 100, 150, 200, 300, 500, 1000].filter((t) => t <= max * 1.5)

  return thresholds.map((value) => ({
    value,
    label: `Under $${value}`,
  }))
}
