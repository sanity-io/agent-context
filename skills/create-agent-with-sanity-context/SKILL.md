---
name: create-agent-with-sanity-context
description: Build AI agents with structured access to Sanity content via Agent Context. Use when setting up a Sanity-powered chatbot, connecting an AI assistant to Sanity content, or adding client-side tools to an agent. Covers Studio setup, agent implementation, and advanced patterns.
---

# Build an Agent with Sanity Context

Give AI agents intelligent access to your Sanity content. Unlike embedding-only approaches, Context MCP is schema-aware—agents can reason over your content structure, query with real field values, follow references, and combine structural filters with semantic search.

**What this enables:**

- Agents understand the relationships between your content types
- Queries use actual schema fields, not just text similarity
- Results respect your content model (categories, tags, references)
- Semantic search is available when needed, layered on structure

Note: Context MCP understands your schema structure but not your domain. You'll provide domain context (what your content is for, how to use it) through the agent's system prompt.

## What You'll Need

Before starting, gather these credentials:

| Credential                | Where to get it                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sanity Project ID**     | Your `sanity.config.ts` or [sanity.io/manage](https://sanity.io/manage)                                                                                                |
| **Dataset name**          | Usually `production` — check your `sanity.config.ts`                                                                                                                   |
| **Sanity API read token** | Create at [sanity.io/manage](https://sanity.io/manage) → Project → API → Tokens. See [HTTP Auth docs](https://www.sanity.io/docs/content-lake/http-auth#k967e449638bc) |
| **LLM API key**           | From your LLM provider (Anthropic, OpenAI, etc.) — any provider works                                                                                                  |

## How Context MCP Works

An MCP server that gives AI agents structured access to Sanity content. The core integration pattern:

1. **MCP Connection**: HTTP transport to the Context MCP URL
2. **Authentication**: Bearer token using Sanity API read token
3. **Tool Discovery**: Get available tools from MCP client, pass to LLM
4. **System Prompt**: Domain-specific instructions that shape agent behavior

**MCP URL formats:**

- `https://api.sanity.io/:apiVersion/agent-context/:projectId/:dataset` — Access all content in the dataset
- `https://api.sanity.io/:apiVersion/agent-context/:projectId/:dataset/:slug` — Access filtered content (requires agent context document with that slug)

The slug-based URL uses the GROQ filter defined in your agent context document to scope what content the agent can access. Use this for production agents that should only see specific content types.

**The integration is simple**: Connect to the MCP URL, get tools, use them. The reference implementation shows one way to do this—adapt to your stack and LLM provider.

## Available MCP Tools

| Tool              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `initial_context` | Get compressed schema overview (types, fields, document counts) |
| `groq_query`      | Execute GROQ queries with optional semantic search              |
| `schema_explorer` | Get detailed schema for a specific document type                |

**For development and debugging:** The general Sanity MCP provides broader access to your Sanity project (schema deployment, document management, etc.). Useful during development but not intended for customer-facing applications.

## Before You Start: Understand the User's Situation

A complete integration has **three distinct components** that may live in different places:

| Component                   | What it is                                                      | Examples                                                                        |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **1. Studio Setup**         | Configure the context plugin and create agent context documents | Sanity Studio (separate repo or embedded)                                       |
| **2. Agent Implementation** | Code that connects to Context MCP and handles LLM interactions  | Next.js API route, Express server, Python service, or any MCP-compatible client |
| **3. Frontend (Optional)**  | UI for users to interact with the agent                         | Chat widget, search interface, CLI—or none for backend services                 |

**Studio setup and agent implementation are required.** Frontend is optional—many agents run as backend services or integrate into existing UIs.

Ask the user which part they need help with:

- **Components in different repos** (most common): You may only have access to one component. Complete what you can, then tell the user what steps remain for the other repos.
- **Co-located components**: All three in the same project—work through them one at a time (Studio → Agent → Frontend).
- **Already on step 2 or 3**: If you can't find a Studio in the codebase, ask the user if Studio setup is complete.

Also understand:

1. **Their stack**: What framework/runtime? (Next.js, Remix, Node server, Python, etc.)
2. **Their AI library**: Vercel AI SDK, LangChain, direct API calls, etc.
3. **Their domain**: What will the agent help with? (Shopping, docs, support, search, etc.)

The reference patterns use Next.js + Vercel AI SDK, but adapt to whatever the user is working with.

## Workflow

### Quick Validation (Optional)

Before building an agent, you can validate MCP access directly using the base URL (no slug required):

```bash
curl -X POST https://api.sanity.io/YOUR_API_VERSION/agent-context/YOUR_PROJECT_ID/YOUR_DATASET \
  -H "Authorization: Bearer $SANITY_API_READ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

This confirms your token works and the MCP endpoint is reachable. The base URL gives access to all content—useful for testing before setting up content filters via agent context documents.

### Step 1: Set up Sanity Studio

Configure the context plugin and create agent context documents to scope what content the agent can access.

See [references/studio-setup.md](references/studio-setup.md)

### Step 2: Build the Agent (Adapt to user's stack)

**Already have an agent or MCP client?** You just need to connect it to your Context MCP URL with a Bearer token. The tools will appear automatically.

**Building from scratch?** The reference implementations use Vercel AI SDK with Anthropic, but the pattern works with any LLM provider (OpenAI, local models, etc.). Start with the basics and add advanced patterns as needed.

**Framework-specific guides:**

- **Next.js**: See [references/nextjs-agent.md](references/nextjs-agent.md)
- **SvelteKit**: See [references/sveltekit-agent.md](references/sveltekit-agent.md)
- **Other stacks** (Express, Remix, Python, LangChain): See [references/adapting-to-stacks.md](references/adapting-to-stacks.md)

**System prompts** (applies to all frameworks): See [references/system-prompts.md](references/system-prompts.md) for structure and domain-specific examples (e-commerce, docs, support, content curation).

The framework guides cover:

- **Core setup** (required): MCP connection, authentication, basic chat route
- **Frontend** (optional): Chat component for the framework
- **Advanced patterns** (optional): Client-side tools, auto-continuation, custom rendering

### Step 3: Conversation Classification (Optional)

Track and analyze agent conversations using Sanity Functions. Useful for analytics, debugging, and understanding user interactions.

See [references/conversation-classification.md](references/conversation-classification.md).

### Step 4: Explore and Optimize (Recommended)

Once the agent works, install `@sanity/agent-context-explorer` and run the `agent-context-explorer` CLI to discover what your dataset contains, then use the `optimize-agent-prompt` skill to build a production-quality system prompt:

```bash
npx skills add https://github.com/sanity-io/agent-context --skill optimize-agent-prompt
```

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

The MCP connection pattern is framework and LLM-agnostic. Whether Next.js, Remix, Express, or Python FastAPI—the HTTP transport works the same. Any LLM provider that supports tool calling will work.

See [references/adapting-to-stacks.md](references/adapting-to-stacks.md) for:

- Framework-specific route patterns (Express, Remix, Python)
- AI library integrations (LangChain, direct API calls)

See [references/system-prompts.md](references/system-prompts.md) for domain-specific examples (e-commerce, docs, support, content curation).

## Best Practices

- **Start simple**: Build the basic integration first, then add advanced patterns as needed
- **Schema design**: Use descriptive field names—agents rely on schema understanding
- **GROQ queries**: Always include `_id` in projections so agents can reference documents
- **Content filters**: Start broad, then narrow based on what the agent actually needs
- **System prompts**: Be explicit about forbidden behaviors and formatting rules
- **Package versions**: NEVER guess package versions. Always check the reference `package.json` files or use `npm info <package> version`. AI SDK and Sanity packages update frequently—outdated versions will cause errors.

## Troubleshooting

### Context MCP returns errors or no schema

Context MCP requires your schema to be available server-side. This happens automatically when your Studio runs, but if it's not working:

1. **Check Studio version**: Ensure you're on Sanity Studio v5.1.0 or later
2. **Open your Studio**: Simply opening the Studio in a browser triggers schema deployment
3. **Verify deployment**: After opening Studio, retry the MCP connection

### Escape hatch: Deploy schema via Sanity MCP

If you're on a **cloud-only platform** (Lovable, v0, Replit) without a local Studio, or if local Studio schema deployment isn't working, you can deploy schemas using the Sanity MCP server's `deploy_schema` tool.

**To install the Sanity MCP** (if you don't have it already):

```bash
npx sanity@latest mcp configure
```

This configures the MCP for your AI editor (Claude Code, Cursor, VS Code, etc.). Once connected, ask your AI assistant to use the `deploy_schema` tool to deploy your content types.

> **Recommended approach:** If you have a local Sanity Studio, deploying via the Studio is preferred:
>
> - Local schema files (in `schemaTypes/`) are the **source of truth**
> - Using `deploy_schema` directly can create drift between your code and the deployed schema
> - Edit your local schema files and run `npx sanity schema deploy` instead
>
> Use this escape hatch when local deployment isn't an option or isn't working.

### "401 Unauthorized" from MCP

Your `SANITY_API_READ_TOKEN` is missing or invalid. Generate a new token at [sanity.io/manage](https://sanity.io/manage) → Project → API → Tokens with Viewer permissions.

### "No documents found" / Empty results

Check your Agent Context's content filter:

- Is the GROQ filter correct?
- Are the document types spelled correctly?
- Are there published documents matching the filter?

### Tools not appearing

1. Check that `mcpClient.tools()` returns tools (log it)
2. Ensure the MCP URL is correct (project ID, dataset, slug)
3. Verify the agent context document is published
