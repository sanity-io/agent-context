import {CopyIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Stack, Text, useToast} from '@sanity/ui'
import {
  DEFAULT_STUDIO_CLIENT_OPTIONS,
  getValueAtPath,
  type InputProps,
  useClient,
  useDataset,
  useProjectId,
} from 'sanity'

import {getMcpURL} from './mcpUrlUtils'

export function AgentContextDocumentInput(props: InputProps) {
  const dataset = useDataset()
  const projectId = useProjectId()
  const toast = useToast()
  const apiHost = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS).config().apiHost

  const slug = getValueAtPath(props.value, ['slug'])
  const mcpURL = getMcpURL({apiHost, projectId, dataset, slug})

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(mcpURL)
      toast.push({
        title: 'Copied to clipboard',
        description: 'The MCP URL has been copied to your clipboard',
        status: 'success',
        closable: true,
      })
    } catch {
      toast.push({
        title: 'Error copying to clipboard',
        description: 'Please copy the MCP URL manually',
        status: 'error',
        closable: true,
      })
    }
  }

  return (
    <Stack space={4}>
      <Card shadow={1} padding={4} paddingLeft={4} radius={2} tone="primary">
        <Stack space={4}>
          <Text size={1} muted weight="medium">
            Context MCP URL
          </Text>

          {mcpURL ? (
            <Flex align="center" gap={2}>
              <Button icon={CopyIcon} mode="bleed" fontSize={1} padding={2} onClick={handleCopy} />

              <Box flex={1}>
                <Text size={1} muted>
                  {mcpURL}
                </Text>
              </Box>
            </Flex>
          ) : (
            <Box paddingY={2}>
              <Text size={1} muted>
                No slug found. Please generate a slug to see the Context MCP URL.
              </Text>
            </Box>
          )}
        </Stack>
      </Card>

      {props.renderDefault(props)}
    </Stack>
  )
}
