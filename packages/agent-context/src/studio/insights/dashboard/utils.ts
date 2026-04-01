import type {BadgeTone} from '@sanity/ui'
import {useCallback, useMemo} from 'react'
import {useObservable} from 'react-rx'
import {merge, of, Subject} from 'rxjs'
import {catchError, map, startWith, switchMap} from 'rxjs/operators'
import {DEFAULT_STUDIO_CLIENT_OPTIONS, useClient} from 'sanity'

import type {Sentiment} from './types'

export function formatSentiment(sentiment: Sentiment): string {
  return sentiment.charAt(0).toUpperCase() + sentiment.slice(1)
}

/**
 * Score threshold constants for success score evaluation.
 * Scores are on a 1-10 scale where:
 * - 8-10: Good (positive)
 * - 6-7: Okay (caution)
 * - 1-5: Poor (critical)
 */
const SCORE_THRESHOLDS = {
  GOOD: 8,
  OKAY: 6,
}

/**
 * Returns the Sanity UI tone for a success score.
 */
export function getScoreTone(
  score: number | undefined,
): 'default' | 'positive' | 'caution' | 'critical' {
  if (score === undefined) return 'default'
  if (score >= SCORE_THRESHOLDS.GOOD) return 'positive'
  if (score >= SCORE_THRESHOLDS.OKAY) return 'caution'
  return 'critical'
}

/**
 * Returns the Sanity UI tone for a sentiment value.
 */
export function getSentimentTone(sentiment: Sentiment | undefined): BadgeTone {
  switch (sentiment) {
    case 'positive':
      return 'positive'
    case 'negative':
      return 'critical'
    default:
      return 'default'
  }
}

export interface UseQueryResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  retry: () => void
}

const LOADING_RESULT: UseQueryResult<never> = {
  data: null,
  error: null,
  loading: true,
  retry: () => {},
}

/**
 * A hook to fetch data with a GROQ query and params.
 *
 * Example:
 *
 * ```tsx
 * export function Foo() {
 *   const {data, error, loading, retry} = useQuery<T>('*[_type == $type]', {
 *     type: 'conversation',
 *   })
 * }
 *
 * if (loading) return <LoadingBlock />
 * if (error) return <ErrorBlock message={error} onRetry={retry} />
 * if (!data) return <div>No data</div>
 *
 * return <div>{data.length}</div>
 * ```
 */
export function useQuery<T>(
  query: string,
  params: Record<string, unknown> = {},
): UseQueryResult<T> {
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS)

  const retry$ = useMemo(() => new Subject<void>(), [])
  const retry = useCallback(() => retry$.next(), [retry$])

  const result$ = useMemo(
    () =>
      merge(of(undefined), retry$).pipe(
        switchMap(() =>
          client.observable.fetch<T>(query, params).pipe(
            map((data): UseQueryResult<T> => ({data, error: null, loading: false, retry})),
            catchError((err: unknown) =>
              of<UseQueryResult<T>>({
                data: null,
                error: err instanceof Error ? err.message : String(err),
                loading: false,
                retry,
              }),
            ),
            startWith<UseQueryResult<T>>({data: null, error: null, loading: true, retry}),
          ),
        ),
      ),
    // Serialized params for value-based comparison — callers pass inline objects
    // which are new references each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, query, JSON.stringify(params), retry$, retry],
  )

  return useObservable(result$, {...LOADING_RESULT, retry})
}
