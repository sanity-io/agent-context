import {useEffect, useState} from 'react'
import type {SanityClient} from 'sanity'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../schemas/conversationSchema'

interface UseThreadIdsResult {
  threadIds: string[]
  error: string | null
  loading: boolean
}

/**
 * Hook for fetching unique thread IDs from conversations.
 */
export function useThreadIds(
  client: SanityClient,
  agentFilter?: string | null,
): UseThreadIdsResult {
  const [threadIds, setThreadIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const query = `array::unique(*[_type == $type && ($agentId == null || agentId == $agentId)].threadId)`

    client
      .fetch<string[]>(query, {
        type: CONVERSATION_SCHEMA_TYPE_NAME,
        agentId: agentFilter ?? null,
      })
      .then((ids) => {
        if (!cancelled) {
          setThreadIds(ids.filter(Boolean))
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
  }, [client, agentFilter])

  return {threadIds, error, loading}
}
