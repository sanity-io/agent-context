---
name: create-agent-with-sanity-context
description: Build AI agents with structured access to Sanity content via Agent Context. Use when setting up a Sanity-powered chatbot, connecting an AI assistant to Sanity content, or adding client-side tools to an agent. Covers Studio setup, agent implementation, and advanced patterns. Always use this skill when users mention building a chatbot with Sanity, creating an AI assistant for their content, setting up Agent Context MCP, integrating Sanity with Claude/GPT/any LLM, making content searchable by AI, implementing semantic search over Sanity data, or connecting their CMS to an AI agent.
---

# Build an Agent with Sanity Context

Give AI agents intelligent access to your Sanity content. Unlike embedding-only approaches, Agent Context is schema-aware—agents can reason over your content structure, query with real field values, follow references, and combine structural filters with semantic search.

**What this enables:**

- Agents understand the relationships between your content types
- Queries use actual schema fields, not just text similarity
- Results respect your content model (categories, tags, references)
- Semantic search is available when needed, layered on structure

Agent Context gives agents your schema and teaches them GROQ, but it can't know your domain. You close that gap through the **Instructions field** (dataset-specific query guidance) and optionally the **system prompt** (agent behavior and tone).

**Three actors in this workflow:**

- **You** — the agent executing this skill, helping the user set things up
- **The user** — the human you're working with, who knows their domain and data
- **The production agent** — the agent being built, which will serve end users

## What You'll Need

Before starting, gather these credentials:

| Credential                | Where to get it                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sanity Project ID**     | Your `sanity.config.ts` or [sanity.io/manage](https://sanity.io/manage)                                                                                                                                                                           |
| **Dataset name**          | Usually `production` — check your `sanity.config.ts`                                                                                                                                                                                              |
| **Sanity API read token** | Run `npx sanity tokens add "Agent Context" --role=viewer --yes --json` from the project directory (or pass `--project-id=<id>`). Alternatively, create at [sanity.io/manage](https://sanity.io/manage) → Project → API → Tokens with Viewer role. |
| **LLM API key**           | From your LLM provider (Anthropic, OpenAI, etc.) — any provider works                                                                                                                                                                             |

## How Agent Context Works

An MCP server that gives AI agents structured access to Sanity content. The core integration pattern:

1. **MCP Connection**: HTTP transport to the Agent Context URL
2. **Authentication**: Bearer token using Sanity API read token
3. **Tool Discovery**: Get available tools from MCP client, pass to LLM
4. **System Prompt**: Tell the production agent its role, tone, and boundaries

**MCP URL formats:**

- `https://api.sanity.io/:apiVersion/agent-context/:projectId/:dataset` — **Base URL.** No document needed, configure via query params or use as-is.
- `https://api.sanity.io/:apiVersion/agent-context/:projectId/:dataset/:slug` — **Document URL.** Applies the configuration from an Agent Context document.

**Agent Context documents** (type `sanity.agentContext`) are created in Sanity Studio and configure the MCP endpoint. They have three fields:

| Field              | Schema field   | Purpose                                                                 |
| ------------------ | -------------- | ----------------------------------------------------------------------- |
| **Slug**           | `slug`         | Unique URL identifier — becomes the `:slug` in the MCP URL              |
| **Instructions**   | `instructions` | Domain-specific guidance for the agent, injected into tool descriptions |
| **Content Filter** | `groqFilter`   | A GROQ expression scoping which documents the agent can access          |

This means Studio users can manage agent behavior without touching code — updating instructions or narrowing the content filter takes effect immediately.

**URL query params** override the document's configuration (useful for testing and development):

- `?instructions=<content>` — Override instructions (use `?instructions=""` for a blank slate)
- `?groqFilter=<expression>` — Override the content filter

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

| Component                   | What it is                                                       | Examples                                                                        |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **1. Studio Setup**         | Configure the context plugin and create agent context documents  | Sanity Studio (separate repo or embedded)                                       |
| **2. Agent Implementation** | Code that connects to Agent Context and handles LLM interactions | Next.js API route, Express server, Python service, or any MCP-compatible client |
| **3. Frontend (optional)**  | UI for users to interact with the agent                          | Chat widget, search interface, CLI—or none for backend services                 |

A deployed Studio (v5.1.0+) is always required. Not every integration needs the agent context plugin or document—the base MCP URL works without them, so users can start with just agent implementation and add document configuration later—or vice versa. Frontend depends on the use case (many agents run as backend services or integrate into existing UIs).

Ask the user which part they need help with:

- **Components in different repos** (most common): You may only have access to one component. Complete what you can, then tell the user what steps remain for the other repos.
- **Co-located components**: All three in the same project—work through them based on what the user wants to tackle first.
- **No Studio in the codebase?** Ask the user if Studio setup is done elsewhere, or if they want to skip the agent context plugin and document for now—the base URL works without them.

Also understand:

1. **Their stack**: What framework/runtime? (Next.js, Remix, Node server, Python, etc.)
2. **Their AI library**: Vercel AI SDK, LangChain, direct API calls, etc.
3. **Their domain**: What will the agent help with? (Shopping, docs, support, search, etc.)

The reference patterns use Next.js + Vercel AI SDK, but adapt to whatever the user is working with.

## Workflow

### Quick Validation (Optional)

Before building the production agent, validate that the MCP endpoint is reachable. If the user doesn't have a read token yet, offer to create one from the terminal — detect the `projectId` from `sanity.config.ts` or `sanity.cli.ts` if available:

```bash
npx sanity tokens add "Agent Context" --role=viewer --yes --json
```

This outputs JSON with the token value. If not inside a Sanity project directory, pass `--project-id=<id>` explicitly.

Then test the endpoint:

```bash
curl -X POST https://api.sanity.io/YOUR_API_VERSION/agent-context/YOUR_PROJECT_ID/YOUR_DATASET \
  -H "Authorization: Bearer $SANITY_API_READ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

This confirms the token works and the endpoint is reachable. The base URL (no slug) works without an Agent Context document—add a slug to apply a document's configuration.

### Step 1: Build the Agent (Adapt to user's stack)

**The user already has an agent or MCP client?** They just need to connect it to their Agent Context URL with a Bearer token. The tools will appear automatically.

**Building from scratch?** Help the user set up the MCP connection and LLM integration. The reference implementations use Vercel AI SDK with Anthropic, but the pattern works with any LLM provider (OpenAI, local models, etc.). Start with the basics and add advanced patterns as needed.

**Framework-specific guides:**

- **Next.js**: See [references/nextjs-agent.md](references/nextjs-agent.md)
- **SvelteKit**: See [references/sveltekit-agent.md](references/sveltekit-agent.md)
- **Other stacks** (Express, Remix, Python, LangChain): See [references/adapting-to-stacks.md](references/adapting-to-stacks.md)

**System prompts** (applies to all frameworks): See [references/system-prompts.md](references/system-prompts.md) for structure and domain-specific examples (e-commerce, docs, support, content curation).

The framework guides cover:

- **Core setup** (required): MCP connection, authentication, basic chat route
- **Frontend** (optional): Chat component for the framework
- **Advanced patterns** (optional): Client-side tools, auto-continuation, custom rendering

### Step 2: Set up Sanity Studio

Help the user configure the `@sanity/agent-context/studio` plugin in their Studio and create an Agent Context document. This document controls what the production agent can see (via `groqFilter`) and what guidance it receives (via `instructions`).

See [references/studio-setup.md](references/studio-setup.md)

### Step 3: Conversation Classification (Optional)

Track and analyze agent conversations using Sanity Functions. Useful for analytics, debugging, and understanding user interactions.

See [references/conversation-classification.md](references/conversation-classification.md).

### Step 4: Tune Your Agent (Recommended)

Once the production agent works:

1. **Tune the Instructions field** using the `dial-your-context` skill — an interactive session where you explore the user's dataset together, verify findings, and produce concise Instructions that teach the production agent what the schema alone doesn't make obvious: counter-intuitive field names, second-order reference chains, data quality issues, required filters, and query patterns. The skill can also help configure a `groqFilter` to scope what content the production agent sees.

2. **Shape the system prompt** (optional) using the `shape-your-agent` skill — if the user controls the production agent's system prompt, this helps define tone, boundaries, and guardrails. Skip this if the user doesn't control the system prompt.

## GROQ with Semantic Search

Agent Context supports `text::semanticSimilarity()` for semantic ranking:

```groq
*[_type == "article" && category == "guides"]
  | score(text::semanticSimilarity("getting started tutorial"))
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
- **Content filters**: Use `groqFilter` to scope what the production agent sees — start broad, then narrow based on what it actually needs. The filter is a full GROQ expression (e.g., `_type in ["product", "article"]`)
- **Instructions field**: Keep it concise — only include what the auto-generated schema doesn't make obvious. Don't duplicate schema information. See the `dial-your-context` skill.
- **System prompts**: Be explicit about forbidden behaviors and formatting rules. Less is more — an over-engineered prompt can interfere with the Instructions content. See the `shape-your-agent` skill.
- **Package versions**: Always check the reference `package.json` files or use `npm info <package> version` rather than guessing. AI SDK and Sanity packages update frequently, and using outdated versions will cause errors that are hard to debug.

## Troubleshooting

### Agent Context returns errors or no schema

Agent Context requires a deployed Studio. See [Deploy Your Studio](references/studio-setup.md#deploy-your-studio) for instructions.

### "401 Unauthorized" from MCP

The `SANITY_API_READ_TOKEN` is missing or invalid. Generate a new token from the terminal:

```bash
npx sanity tokens add "Agent Context" --role=viewer --yes --json
```

Or create one at [sanity.io/manage](https://sanity.io/manage) → Project → API → Tokens with Viewer role.

### "No documents found" / Empty results

Check the Agent Context document's content filter (`groqFilter`):

- Is the GROQ filter correct?
- Are the document types spelled correctly?
- Are there published documents matching the filter?

### Tools not appearing

1. Check that `mcpClient.tools()` returns tools (log it)
2. Ensure the MCP URL is correct (project ID, dataset, and optionally slug)
3. If using a slug-based URL, verify the agent context document is published
