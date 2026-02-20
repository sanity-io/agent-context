import {Product} from './Product'

interface DocumentProps {
  id: string
  type: string
  isInline: boolean
}

/**
 * Routes document directives to type-specific components.
 *
 * Flow: AI outputs directive -> remarkAgentDirectives parses -> this component routes by type
 *
 * Directive syntax (defined in route.ts system prompt):
 *   ::document{id="<_id>" type="<_type>"}  - Block (cards in lists)
 *   :document{id="<_id>" type="<_type>"}   - Inline (links in sentences)
 *
 * To add a new type: add a case here and create the component (see Product.tsx).
 */
export function Document(props: DocumentProps) {
  const {id, type, isInline} = props

  // During streaming, props may be incomplete - silently skip
  if (!id) return null

  if (type === 'product') {
    return <Product id={id} isInline={isInline} />
  }

  return null
}
