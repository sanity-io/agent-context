# Conversation Classification with Sanity Functions

Save and classify agent conversations using Sanity Functions. This enables analytics, debugging, and insights into how users interact with your agent.

> **Reference Implementation**: See [ecommerce/\_index.md](ecommerce/_index.md) for file navigation, then explore [ecommerce/studio/functions/](ecommerce/studio/functions/) and [ecommerce/studio/sanity.blueprint.ts](ecommerce/studio/sanity.blueprint.ts).

## Overview

The classification system has three parts:

1. **Conversation Schema** - Document type to store conversations
2. **Blueprint** - Triggers a function when conversations change
3. **Classification Function** - Analyzes conversations with AI

## Critical: Delta Functions Prevent Infinite Loops

When a function updates a document, it can trigger itself again. Without proper filtering, this creates an **infinite loop**.

### The Problem

```ts
// BAD - triggers on ANY update, including the function's own updates
filter: '_type == "agent.conversation"'
```

What happens:

1. User sends message → conversation updated → function triggers
2. Function adds classification → conversation updated → function triggers again
3. Function runs again → updates classification → triggers again
4. **Infinite loop**

### The Solution

Use delta functions to filter for **specific changes**:

```ts
// GOOD - only triggers when messages actually change
filter: '_type == "agent.conversation" && (delta::changedAny(messages) || (delta::operation() == "create" && defined(messages)))'
```

| Delta Function             | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `delta::changedAny(field)` | True only if the specified field changed      |
| `delta::operation()`       | Returns `"create"`, `"update"`, or `"delete"` |

This filter triggers when:

- The `messages` field changes (user sent a message)
- A new conversation is created with messages

It does **not** trigger when:

- The `classification` field is updated (function's own update)
- The `summary` field is updated
- Any other field changes

## Implementation

See the reference implementation files:

| Component                | File                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Conversation schema      | [ecommerce/studio/schemaTypes/documents/agentConversation.ts](ecommerce/studio/schemaTypes/documents/agentConversation.ts) |
| Blueprint config         | [ecommerce/studio/sanity.blueprint.ts](ecommerce/studio/sanity.blueprint.ts)                                               |
| Classification function  | [ecommerce/studio/functions/agent-conversation/index.ts](ecommerce/studio/functions/agent-conversation/index.ts)           |
| Save conversation helper | [ecommerce/app/src/lib/save-conversation.ts](ecommerce/app/src/lib/save-conversation.ts)                                   |
| Usage in chat route      | [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts) (lines 109-113)                         |
| Package versions         | [ecommerce/studio/package.json](ecommerce/studio/package.json)                                                             |

## Troubleshooting

### Function triggers infinitely

Your filter is missing delta functions. See "The Solution" above.

### Function never triggers

- Is the blueprint deployed? (`npx sanity blueprints deploy`)
- Does the filter match your document type name exactly?
- Are you updating the `messages` field (not just other fields)?

### Classification not saved

Ensure your function updates different fields than what triggers it.
