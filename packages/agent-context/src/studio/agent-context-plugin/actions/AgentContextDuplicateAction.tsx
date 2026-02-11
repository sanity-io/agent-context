import {CopyIcon} from '@sanity/icons'
import {uuid} from '@sanity/uuid'
import {useCallback, useMemo, useTransition} from 'react'
import {filter, firstValueFrom} from 'rxjs'
import {
  type DocumentActionComponent,
  type DocumentActionProps,
  getVersionFromId,
  InsufficientPermissionsMessage,
  useCurrentUser,
  useDocumentOperation,
  useDocumentPairPermissions,
  useDocumentStore,
  useTranslation,
} from 'sanity'
import {useRouter} from 'sanity/router'

const DISABLED_REASON_KEY = {
  NOTHING_TO_DUPLICATE: 'action.duplicate.disabled.nothing-to-duplicate',
  NOT_READY: 'action.duplicate.disabled.not-ready',
} as const

/**
 * Creates a duplicate action that generates document IDs with an optional prefix.
 * Mirrors the core DuplicateAction behavior (permissions, i18n, async navigation)
 * but prefixes the generated ID when a prefix is provided.
 *
 * @param prefix - The prefix to add to document IDs, or null to disable prefixing
 * @internal
 */
export function createAgentContextDuplicateAction(prefix: string | null): DocumentActionComponent {
  const AgentContextDuplicateAction: DocumentActionComponent = (props: DocumentActionProps) => {
    const {id, type, version, release} = props
    const documentStore = useDocumentStore()
    const bundleId = version?._id && getVersionFromId(version._id)

    const {duplicate} = useDocumentOperation(id, type, bundleId)
    const {navigateIntent} = useRouter()
    const [isDuplicating, startDuplicating] = useTransition()

    const [permissions, isPermissionsLoading] = useDocumentPairPermissions({
      id,
      type,
      version: release,
      permission: 'duplicate',
    })

    const {t} = useTranslation('structure')

    const currentUser = useCurrentUser()

    const handle = useCallback(() => {
      startDuplicating(async () => {
        const dupeId = prefix === null ? uuid() : `${prefix}.${uuid()}`

        const duplicateSuccess = firstValueFrom(
          documentStore.pair
            .operationEvents(id, type)
            .pipe(
              filter(
                (e: {op: string; type: string}) => e.op === 'duplicate' && e.type === 'success',
              ),
            ),
        )
        duplicate.execute(dupeId)

        await duplicateSuccess
        navigateIntent('edit', {id: dupeId, type})
      })
    }, [documentStore.pair, duplicate, id, navigateIntent, startDuplicating, type])

    return useMemo(() => {
      if (!isPermissionsLoading && !permissions?.granted) {
        return {
          icon: CopyIcon,
          disabled: true,
          label: t('action.duplicate.label'),
          title: (
            <InsufficientPermissionsMessage
              context="duplicate-document"
              currentUser={currentUser}
            />
          ),
        }
      }

      return {
        icon: CopyIcon,
        disabled: isDuplicating || Boolean(duplicate.disabled) || isPermissionsLoading,
        label: isDuplicating ? t('action.duplicate.running.label') : t('action.duplicate.label'),
        title: duplicate.disabled ? t(DISABLED_REASON_KEY[duplicate.disabled]) : '',
        onHandle: handle,
      }
    }, [
      currentUser,
      duplicate.disabled,
      handle,
      isDuplicating,
      isPermissionsLoading,
      permissions?.granted,
      t,
    ])
  }

  AgentContextDuplicateAction.action = 'duplicate'
  AgentContextDuplicateAction.displayName = 'AgentContextDuplicateAction'

  return AgentContextDuplicateAction
}
