import {CommentIcon} from '@sanity/icons'
import {Box, Card, Flex, Grid, Select, Tab, TabList, TabPanel, Text, TextInput} from '@sanity/ui'
import {useCallback, useState} from 'react'
import {useClient} from 'sanity'

import {AnalyticsOverview} from './AnalyticsOverview'
import {SANITY_API_VERSION} from './constants'
import {ConversationDetail} from './ConversationDetail'
import {ConversationList} from './ConversationList'
import type {SortOption} from './types'
import {useAgentIds} from './useAgentIds'
import {useThreadIds} from './useThreadIds'

type TabId = 'overview' | 'conversations'

const SORT_OPTIONS: {value: SortOption; label: string}[] = [
  {value: 'date-desc', label: 'Newest first'},
  {value: 'date-asc', label: 'Oldest first'},
  {value: 'score-asc', label: 'Lowest score'},
  {value: 'sentiment', label: 'Negative first'},
]

/**
 * Main dashboard component for Agent Insights.
 * Provides tabs for analytics overview and conversation browsing.
 */
export function InsightsDashboard() {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [agentFilter, setAgentFilter] = useState<string | null>(null)
  const [threadFilter, setThreadFilter] = useState<string | null>(null)
  const [contentGapFilter, setContentGapFilter] = useState<string | null>(null)
  const [daysBack, setDaysBack] = useState(30)
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')

  const {agentIds} = useAgentIds(client)
  const {threadIds} = useThreadIds(client, agentFilter)

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedConversationId(null)
  }, [])

  const handleAgentFilterChange = useCallback((agentId: string | null) => {
    setAgentFilter(agentId)
    // Clear thread filter when agent changes since thread IDs are scoped to agent
    setThreadFilter(null)
  }, [])

  const handleThreadFilterChange = useCallback((threadId: string | null) => {
    setThreadFilter(threadId)
  }, [])

  const handleContentGapClick = useCallback((gapDescription: string) => {
    setContentGapFilter(gapDescription)
    setActiveTab('conversations')
  }, [])

  const handleClearContentGapFilter = useCallback(() => {
    setContentGapFilter(null)
  }, [])

  return (
    <Card sizing="border" style={{height: '100%', overflow: 'hidden'}}>
      <Flex direction="column" style={{height: '100%'}}>
        {/* Header with Tabs and Filters */}
        <Card padding={4} paddingBottom={3} borderBottom>
          <Flex direction="column" gap={4}>
            <Text as="h1" size={4} weight="semibold">
              Agent Context Insights
            </Text>

            <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
              <TabList space={1}>
                <Tab
                  aria-controls="overview-panel"
                  id="overview-tab"
                  label="Overview"
                  onClick={() => setActiveTab('overview')}
                  selected={activeTab === 'overview'}
                />

                <Tab
                  aria-controls="conversations-panel"
                  id="conversations-tab"
                  label="Conversations"
                  onClick={() => setActiveTab('conversations')}
                  selected={activeTab === 'conversations'}
                />
              </TabList>

              {/* Unified Filters */}
              <Flex gap={3} align="center" wrap="wrap">
                <Flex gap={2} align="center">
                  <Text size={1} muted>
                    Last
                  </Text>

                  <TextInput
                    type="number"
                    value={daysBack}
                    onChange={(e) => setDaysBack(Math.max(1, parseInt(e.currentTarget.value) || 1))}
                    style={{width: 60}}
                  />

                  <Text size={1} muted>
                    days
                  </Text>
                </Flex>

                <Box style={{width: 1, height: 20, backgroundColor: 'var(--card-border-color)'}} />

                <Flex gap={2} align="center">
                  <Text size={1} muted>
                    Agent
                  </Text>

                  <Select
                    value={agentFilter ?? ''}
                    onChange={(e) => {
                      handleAgentFilterChange(e.currentTarget.value || null)
                    }}
                  >
                    <option value="">All</option>

                    {agentIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </Select>
                </Flex>

                {/* Conversations-only filters */}
                {activeTab === 'conversations' && (
                  <>
                    <Flex gap={2} align="center">
                      <Text size={1} muted>
                        Thread
                      </Text>

                      <Select
                        value={threadFilter ?? ''}
                        onChange={(e) => handleThreadFilterChange(e.currentTarget.value || null)}
                      >
                        <option value="">All</option>

                        {threadIds.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </Select>
                    </Flex>

                    <Flex gap={2} align="center">
                      <Text size={1} muted>
                        Sort
                      </Text>

                      <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.currentTarget.value as SortOption)}
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </Flex>
                  </>
                )}
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* Tab Panels */}
        <TabPanel
          aria-labelledby="overview-tab"
          id="overview-panel"
          hidden={activeTab !== 'overview'}
          style={{flex: 1, overflow: 'auto'}}
        >
          <AnalyticsOverview
            daysBack={daysBack}
            agentFilter={agentFilter}
            onContentGapClick={handleContentGapClick}
          />
        </TabPanel>

        <TabPanel
          aria-labelledby="conversations-tab"
          id="conversations-panel"
          hidden={activeTab !== 'conversations'}
          style={{flex: 1, overflow: 'hidden', padding: 20}}
        >
          <Grid columns={2} gap={5} style={{height: '100%'}}>
            {/* Conversation List */}
            <Card radius={2} border style={{overflow: 'hidden', height: '100%'}}>
              <ConversationList
                onSelect={handleSelectConversation}
                selectedId={selectedConversationId}
                daysBack={daysBack}
                agentFilter={agentFilter}
                threadFilter={threadFilter}
                sortBy={sortBy}
                contentGapFilter={contentGapFilter}
                onClearContentGapFilter={handleClearContentGapFilter}
              />
            </Card>

            {/* Conversation Detail or Placeholder */}
            {selectedConversationId ? (
              <ConversationDetail
                conversationId={selectedConversationId}
                onClose={handleCloseDetail}
              />
            ) : (
              <Card
                radius={2}
                tone="transparent"
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed var(--card-border-color)',
                }}
              >
                <CommentIcon
                  style={{
                    fontSize: 48,
                    color: 'var(--card-muted-fg-color)',
                    opacity: 0.2,
                  }}
                />
              </Card>
            )}
          </Grid>
        </TabPanel>
      </Flex>
    </Card>
  )
}
