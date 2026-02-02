---
name: create-agent-with-sanity-context
description: Build AI agents with structured access to Sanity content via Context MCP. Covers Studio setup, agent implementation, and advanced patterns like client-side tools and custom rendering.
---

# Build an Agent with Sanity Context

Build AI agents that have structured access to Sanity content via Context MCP.

## Before You Start: Understand the User's Context

A complete integration has **three distinct components** that may live in different places:

| Component                   | What it is                                                      | Examples                                                               |
| --------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **1. Studio Setup**         | Configure the context plugin and create agent context documents | Sanity Studio (separate repo or embedded)                              |
| **2. Agent Implementation** | Server-side code that connects to MCP and calls the LLM         | Next.js API route, Express server, Python service, serverless function |
| **3. Frontend (Optional)**  | UI for users to interact with the agent                         | Chat widget, search interface, CLI—or none if it's a backend service   |

**All three components are needed**, but they're often in different places. Ask the user which part they need help with right now:

- **Components in different repos** (most common): You may only have access to one component. Complete what you can, then tell the user what steps remain for the other repos.
- **Co-located components**: All three in the same project—you can do everything, but work through them one at a time (Studio → Agent → Frontend).
- **Already on step 2 or 3**: If you can't find a Studio in the codebase, ask the user if Studio setup is complete. If not, tell them it's a prerequisite before continuing.

Also understand:

1. **Their stack**: What framework/runtime? (Next.js, Remix, Node server, Python, etc.)
2. **Their AI library**: Vercel AI SDK, LangChain, direct API calls, etc.
3. **Their domain**: What will the agent help with? (Shopping, docs, support, search, etc.)

The reference patterns use Next.js + Vercel AI SDK, but adapt to whatever the user is working with.

## What is Context MCP?

An MCP server that gives AI agents structured access to Sanity content. Unlike embedding-based approaches, Context MCP preserves schema structure—agents can filter by real field values, follow references, and combine structural queries with semantic search.

**The core integration is simple**: Connect to the MCP URL, get tools, use them. The patterns below show one way to do this.

## Workflow

### Step 1: Set up Sanity Studio (Required for all approaches)

Configure the context plugin and create agent context documents to scope what content the agent can access.

See [references/studio-setup.md](references/studio-setup.md)

### Step 2: Build the Agent (Adapt to user's stack)

The reference implementation uses Next.js + Vercel AI SDK. Use this as a pattern guide—adapt the concepts to the user's framework and AI library.

See [references/nextjs-agent.md](references/nextjs-agent.md)

**Key concepts that transfer to any stack:**

- MCP client connects via HTTP transport to the context URL
- Authentication via Bearer token (Sanity API read token)
- Three tools available: `initial_context`, `groq_query`, `schema_explorer`
- System prompt customization for domain-specific behavior

**Advanced patterns** (covered in the reference):

- Client-side tools for page context and screenshots
- User context transport (include page URL/title automatically)
- Auto-continuation for multi-step tool calls
- Custom rendering with markdown directives (e.g., product cards)

## Available MCP Tools

| Tool              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `initial_context` | Get compressed schema overview (types, fields, document counts) |
| `groq_query`      | Execute GROQ queries with optional semantic search              |
| `schema_explorer` | Get detailed schema for a specific document type                |

## GROQ with Semantic Search

Context MCP supports `text::embedding()` for semantic ranking:

```groq
*[_type == "article" && category == "guides"]
  | score(text::embedding("getting started tutorial"))
  | order(_score desc)
  { _id, title, summary }[0...10]
```

Always use `order(_score desc)` when using `score()` to get best matches first.

## Adapting to Different Stacks

The MCP connection pattern is framework-agnostic. Whether Next.js, Remix, Express, or Python FastAPI—the HTTP transport works the same.

See [references/nextjs-agent.md](references/nextjs-agent.md#adapting-to-other-stacks) for:

- Framework-specific route patterns (Express, Remix, Python)
- AI library integrations (LangChain, direct Anthropic API)
- System prompt examples for different domains (e-commerce, docs, support)

## Best Practices

- **Start simple**: Build the basic integration first, then add advanced patterns as needed
- **Schema design**: Use descriptive field names—agents rely on schema understanding
- **GROQ queries**: Always include `_id` in projections so agents can reference documents
- **Content filters**: Start broad, then narrow based on what the agent actually needs
- **System prompts**: Be explicit about forbidden behaviors and formatting rules

## Troubleshooting

Common issues and solutions are covered in [references/nextjs-agent.md](references/nextjs-agent.md#troubleshooting).
