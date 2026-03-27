import {useEffect, useState} from 'react'
import type {SanityClient} from 'sanity'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../schemas/conversationSchema'

interface UseAgentIdsResult {
  agentIds: string[]
  error: string | null
  loading: boolean
}

/**
 * Hook for fetching unique agent IDs from conversations.
 * Shared between ConversationList and AnalyticsOverview to avoid duplication.
 */
export function useAgentIds(client: SanityClient): UseAgentIdsResult {
  const [agentIds, setAgentIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    client
      .fetch<string[]>(`array::unique(*[_type == $type].agentId)`, {
        type: CONVERSATION_SCHEMA_TYPE_NAME,
      })
      .then((ids) => {
        if (!cancelled) {
          setAgentIds(ids.filter(Boolean))
          setError(null)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [client])

  return {agentIds, error, loading}
}
