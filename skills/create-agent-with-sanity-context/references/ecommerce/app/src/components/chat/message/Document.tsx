import {Product} from './Product'

export interface DocumentProps {
  id: string
  type: string
  isInline?: boolean
}

/**
 * Routes document directives to type-specific components.
 *
 * Flow: AI outputs directive → remarkDirectives parses → this component routes by type
 *
 * Directive syntax (defined in route.ts system prompt):
 *   ::document{id="<_id>" type="<_type>"}  - Block (cards in lists)
 *   :document{id="<_id>" type="<_type>"}   - Inline (links in sentences)
 *
 * To add a new type: add a case here and create the component (see Product.tsx).
 */
export function Document(props: DocumentProps) {
  if (props.type === 'product') {
    return <Product {...props} />
  }

  return null
}
