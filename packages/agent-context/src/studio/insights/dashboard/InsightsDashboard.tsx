import {CheckmarkIcon, ChevronDownIcon, CommentIcon, DashboardIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Menu, MenuButton, MenuDivider, MenuItem, Stack} from '@sanity/ui'
import {Activity, useId, useState} from 'react'
import {useRouter} from 'sanity/router'
import {styled} from 'styled-components'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../schemas/conversationSchema'
import {Conversations} from './conversations/Conversations'
import {Overview} from './overview/Overview'
import type {ScoreRange, Sentiment} from './types'
import {useQuery} from './utils'

const SidebarCard = styled(Card)`
  width: 220px;
`

/**
 * Main dashboard component for Agent Insights.
 * Provides tabs for analytics overview and conversation browsing.
 */
export function InsightsDashboard() {
  const [contentGapFilter, setContentGapFilter] = useState<string | null>(null)
  const [scoreRange, setScoreRange] = useState<ScoreRange | null>(null)
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | null>(null)

  const agentMenuId = useId()

  const {data: agentIds} = useQuery<string[]>(`array::unique(*[_type == $type].agentId)`, {
    type: CONVERSATION_SCHEMA_TYPE_NAME,
  })

  const router = useRouter()
  const path = router.state['path']
  const routerAgentId = router.state['agentId']
  const routerId = router.state['id']
  const agentFilter =
    typeof routerAgentId === 'string' && routerAgentId !== '*' ? routerAgentId : null
  const selectedConversationId = typeof routerId === 'string' ? routerId : null

  const navigateTo = (newPath: string, agentId?: string | null, id?: string) => {
    const agent = agentId === undefined ? agentFilter : agentId
    const state: Record<string, string> = {path: newPath}

    if (agent) {
      state['agentId'] = agent
    }

    if (id) {
      if (!agent) state['agentId'] = '*'
      state['id'] = id
    }

    router.navigate(state)
  }

  const setAgentFilter = (id: string | null) => {
    navigateTo(typeof path === 'string' ? path : 'overview', id)
  }

  const isOverviewActive = path === 'overview' || !path
  const isConversationsActive = path === 'conversations'

  return (
    <Card sizing="border" height="fill" overflow="hidden">
      <Flex height="fill">
        {/* Header */}
        <SidebarCard padding={3} borderRight tone="transparent">
          <Flex direction="column" gap={4}>
            <Flex gap={4} direction="column">
              <MenuButton
                button={
                  <Button
                    text={agentFilter || 'All agents'}
                    mode="ghost"
                    fontSize={1}
                    iconRight={ChevronDownIcon}
                    justify="space-between"
                  />
                }
                id={agentMenuId}
                popover={{
                  animate: true,
                  constrainSize: true,
                  placement: 'bottom',
                  fallbackPlacements: ['bottom'],
                  tone: 'default',
                  matchReferenceWidth: true,
                }}
                menu={
                  <Menu>
                    <MenuItem
                      text="All agents"
                      onClick={() => setAgentFilter(null)}
                      iconRight={agentFilter ? undefined : CheckmarkIcon}
                    />

                    {agentIds && agentIds.length > 0 && <MenuDivider />}

                    {agentIds?.map((id) => {
                      const isSelected = agentFilter === id

                      return (
                        <MenuItem
                          key={id}
                          text={id}
                          value={id}
                          onClick={() => setAgentFilter(id)}
                          iconRight={isSelected ? CheckmarkIcon : undefined}
                        />
                      )
                    })}
                  </Menu>
                }
              />

              <Stack space={2}>
                <Button
                  fontSize={1}
                  mode="bleed"
                  text="Overview"
                  icon={DashboardIcon}
                  selected={isOverviewActive}
                  onClick={() => navigateTo('overview')}
                  justify="flex-start"
                />

                <Button
                  fontSize={1}
                  mode="bleed"
                  icon={CommentIcon}
                  text="Conversations"
                  selected={isConversationsActive}
                  onClick={() => navigateTo('conversations')}
                  justify="flex-start"
                />
              </Stack>
            </Flex>
          </Flex>
        </SidebarCard>

        <Flex flex={1} direction="column">
          <Activity mode={isOverviewActive ? 'visible' : 'hidden'}>
            <Box flex={1} height="fill" overflow="auto">
              <Overview
                agentFilter={agentFilter}
                onContentGapClick={(gap) => {
                  setContentGapFilter(gap)
                  navigateTo('conversations')
                }}
              />
            </Box>
          </Activity>

          <Activity mode={isConversationsActive ? 'visible' : 'hidden'}>
            <Conversations
              selectedConversationId={selectedConversationId}
              onSelectConversation={(id) => {
                if (selectedConversationId === id) {
                  navigateTo('conversations')
                } else {
                  navigateTo('conversations', undefined, id)
                }
              }}
              onCloseDetail={() => navigateTo('conversations')}
              agentFilter={agentFilter}
              contentGapFilter={contentGapFilter}
              onContentGapFilterChange={setContentGapFilter}
              scoreRange={scoreRange}
              onScoreRangeChange={setScoreRange}
              sentimentFilter={sentimentFilter}
              onSentimentFilterChange={setSentimentFilter}
            />
          </Activity>
        </Flex>
      </Flex>
    </Card>
  )
}
