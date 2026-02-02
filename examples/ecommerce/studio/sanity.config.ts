import {AGENT_CONTEXT_SCHEMA_TYPE_NAME, agentContextPlugin} from '@sanity/agent-context/studio'
import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {type ListItemBuilder, type StructureBuilder, structureTool} from 'sanity/structure'

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
        // Get all schema types except the agent context type
        const defaultListItems = S.documentTypeListItems().filter(
          (item: ListItemBuilder) => item.getId() !== AGENT_CONTEXT_SCHEMA_TYPE_NAME,
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
                    S.documentTypeListItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME).title('Agent Contexts'),
                  ]),
              ),
          ])
      },
    }),
    visionTool(),
    agentContextPlugin(),
  ],

  schema: {
    types: schemaTypes,
  },
})
