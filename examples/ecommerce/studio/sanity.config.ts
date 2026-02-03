import {AGENT_CONTEXT_SCHEMA_TYPE_NAME, agentContextPlugin} from '@sanity/agent-context/studio'
import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {type ListItemBuilder, type StructureBuilder, structureTool} from 'sanity/structure'
import {markdownSchema} from 'sanity-plugin-markdown'

import {schemaTypes} from './schemaTypes'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const apiHost = process.env.SANITY_STUDIO_API_HOST

if (!projectId) {
  throw new Error('Missing SANITY_STUDIO_PROJECT_ID environment variable')
}

export default defineConfig({
  name: 'default',
  title: process.env.SANITY_STUDIO_TITLE || 'Clothing PIM',

  projectId,
  dataset,
  ...(apiHost && {apiHost}),

  plugins: [
    structureTool({
      structure: (S: StructureBuilder) => {
        // Document types to group under "Agents"
        const agentTypes = [AGENT_CONTEXT_SCHEMA_TYPE_NAME, 'agent.config']

        // Get all schema types except agent-related types
        const defaultListItems = S.documentTypeListItems().filter(
          (item: ListItemBuilder) => !agentTypes.includes(item.getId() ?? ''),
        )

        return S.list()
          .title('Content')
          .items([
            ...defaultListItems,
            S.divider(),
            // Group agent related document types together
            S.listItem()
              .title('Agents')
              .child(
                S.list()
                  .title('Agents')
                  .items([
                    S.documentTypeListItem('agent.config').title('Agent Configs'),
                    S.documentTypeListItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME).title('Agent Contexts'),
                  ]),
              ),
          ])
      },
    }),
    visionTool(),
    agentContextPlugin(),
    markdownSchema(),
  ],

  schema: {
    types: schemaTypes,
  },
})
