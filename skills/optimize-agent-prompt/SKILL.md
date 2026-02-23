---
name: optimize-agent-prompt
description: Tune your Sanity Agent Context agent through guided conversation. Transforms exploration data into production-ready instructions and crafts a system prompt tailored to your use case.
---

# Tune Your Agent

Use this skill to turn a basic agent into a high-quality, conversationally strong, data-aware agent. This is an interactive session — you'll provide exploration data, answer questions about your use case, and get back two artifacts:

1. **Instructions field content** — for your Agent Context Document
2. **System prompt** — for your agent's code

## Prerequisites

- **A working agent** — built using the `create-agent-with-sanity-context` skill or equivalent
- **An Agent Context Document** — created in Sanity Studio with the context plugin
- **Exploration data** — run the Agent Context Explorer to understand your dataset

```bash
npx @sanity/agent-context-explorer \
  --mcp-url https://api.sanity.io/vX/agent-context/PROJECT_ID/DATASET/SLUG \
  --questions ./questions.json \
  --sanity-token $SANITY_API_READ_TOKEN \
  --anthropic-api-key $ANTHROPIC_API_KEY
```

Paste the contents of `exploration-results.md` into this conversation when prompted.

## Workflow

### 1. Intake

First, gather the inputs:

- **Exploration data**: Ask the user to paste their `exploration-results.md`
- **Current system prompt**: If they have one, review it for context

**If the user hasn't run the explorer yet**, help them get started:

1. Ask about their use case and what questions their agent should answer
2. Generate a `questions.json` file with 8-15 realistic questions and expected answers
3. The questions should cover the breadth of what the agent will handle — product lookups, comparisons, troubleshooting, edge cases
4. Include expected answers so the explorer can validate whether the dataset can actually answer them

Example questions.json structure:

```json
{
  "questions": [
    {
      "question": "What sizes does the Alpine Jacket come in?",
      "expected_answer": "The Alpine Jacket is available in XS, S, M, L, XL, and XXL."
    },
    {
      "question": "Is the Alpine Jacket waterproof?",
      "expected_answer": "The Alpine Jacket is water-resistant but not fully waterproof. For heavy rain, consider the StormShield Parka which has a waterproof membrane."
    }
  ]
}
```

Once they have exploration data, ask about their use case. Pick relevant questions — don't ask all of them:

**Purpose & Audience**

- What does the agent help users do?
- Who are the users? (customers, internal team, support agents)
- What's in scope? What's explicitly out of scope?

**Language & Locale**

- What languages/locales should the agent support?
- Are there locale-specific content rules?

**Tone & Style**

- Formal or casual? Warm or efficient?
- How verbose? Chat-length or detailed?
- First person ("I") or brand voice ("We")?

**Behavior**

- When should it ask clarifying questions vs answer directly?
- Should it proactively suggest related things?
- How should it handle uncertainty?

**Constraints**

- What should it never discuss? (competitors, pricing, legal advice)
- What should redirect to humans?
- Any hard business rules?

### 2. Transform

Using the exploration data and user answers, extract:

- **Data inventory**: What content types exist and what they're for
- **Query patterns**: Which types/fields to use for which questions, with examples
- **Critical rules**: Operational rules that prevent wasted queries and context blowups (locale filters, null fields, required projections)
- **Limitations**: What's NOT in the dataset (pricing, inventory, etc.)

This becomes the instructions field content. **Don't skip critical rules** — these prevent the most common failures.

### 3. Draft

Produce both artifacts:

**A. Instructions field content**

- Data inventory and structure
- Query patterns with examples
- Critical rules (locale filters, projections, null fields, semantic search)
- Limitations and "do not attempt" rules

**B. System prompt**

- Role statement
- Response style (length, format, clarifying behavior)
- Boundaries and guardrails
- Working with content (query efficiency)
- Accuracy rules

Present both to the user clearly, explaining what goes where.

### 4. Validate

Before finalizing, verify the exploration data and drafted instructions cover everything needed:

**Schema Coverage:**

- [ ] All document types from the MCP schema appear in Schema Reference
- [ ] If types are missing, flag them — user may need to add exploration questions

**Query Pattern Quality:**

- [ ] Each pattern includes a projection (`{ field1, field2 }`) — not full documents
- [ ] Each pattern includes a slice (`[0...N]`) — limits results
- [ ] Reference fields use dereference (`->`) not just `._ref`

**Required Sections:**

- [ ] Critical Rules section exists and comes first
- [ ] Fallback Strategy section exists
- [ ] Known Limitations section exists

**Content Quality:**

- [ ] Rules use imperative language ("Always...", "Never...")
- [ ] Patterns are copy-paste ready (no placeholders)
- [ ] Limitations include what happens when you query them

If gaps exist, ask the user whether to:

- Run more exploration with additional questions
- Add the missing sections manually based on domain knowledge
- Ship with documented blind spots

### 5. Iterate

Refine based on feedback. If the user wants to test against tricky questions, help them evaluate the drafts.

---

## Two Prompt Surfaces

| Surface                                           | What goes here                                                        | How it gets to the agent       |
| ------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| **Agent Context Document → `instructions` field** | Dataset knowledge: schema, query patterns, limitations, field gotchas | Injected automatically via MCP |
| **System prompt**                                 | Agent behavior: role, tone, response style, guardrails                | You control this in code       |

**The key distinction:**

- **Instructions field** = what the agent knows about the data
- **System prompt** = how the agent behaves and communicates

Don't duplicate dataset knowledge in your system prompt — that's what the instructions field is for.

### Quick Reference

| This concern...                                  | Instructions field | System prompt |
| ------------------------------------------------ | ------------------ | ------------- |
| Schema reference (document types, fields)        | ✅                 | ❌            |
| Query patterns that work                         | ✅                 | ❌            |
| Field naming gotchas                             | ✅                 | ❌            |
| Data limitations (null fields, external systems) | ✅                 | ❌            |
| Agent role and persona                           | ❌                 | ✅            |
| Tone of voice                                    | ❌                 | ✅            |
| Response length and format                       | ❌                 | ✅            |
| "Never mention competitors"                      | ❌                 | ✅            |
| "Pricing not in dataset, check website"          | ✅                 | ❌            |
| "Always direct pricing questions to website"     | ❌                 | ✅            |

---

## Instructions Field Structure

The instructions field content should be ordered for maximum impact — put the most critical guidance first.

### 1. Critical Rules (FIRST)

**Put this section at the top.** Operational rules that prevent wasted queries and context blowups. Copy these directly from the exploration data's "Critical Rules" section:

- Required filters (e.g., locale filters to avoid duplicates)
- Fields that are always null (don't waste queries on them)
- When to use semantic search vs structured queries

Don't generalize or rewrite these — use the exact rules from the exploration.

### 2. Schema Reference

What's in the dataset and what each content type is for. Use the Schema Reference table from the exploration data.

### 3. Query Patterns

How to find things effectively. Copy the working patterns from the exploration data — these are tested and known to work. Ensure all examples include projections and slices.

### 4. Known Limitations

What's NOT available — this prevents hallucinations. Copy from the exploration data's "Known Limitations" section.

### 5. About [Brand] (optional)

Brief context about the company/domain. This helps the agent sound knowledgeable but isn't essential for query accuracy. Put it last.

---

## System Prompt Structure

### Role Statement

Who the agent is. Keep it to 2-3 sentences.

```
You are a shopping assistant for [Company]. You help customers find products,
compare options, and answer questions about features and compatibility.
You're friendly, knowledgeable, and concise.
```

### Your Knowledge Source

Directs the agent to treat MCP tool descriptions as its operating manual. This is critical for instruction compliance.

```
## Your Knowledge Source

All your knowledge about [domain] comes from the MCP tools. **The MCP server's instructions are your operating manual** — they tell you:

- Which document types to query for which questions
- Query patterns that actually work (and which don't)
- Critical rules you must follow (filters, projections, etc.)
- What data exists and what doesn't

**Before writing any query, check the MCP tool descriptions.** They contain specific guidance that overrides general intuition. If the instructions say to use a specific document type or filter, do it — even if another approach seems reasonable.
```

### Response Style

```
## How to Respond

- Give direct answers first, then add detail if helpful
- Keep responses concise — a few sentences for simple questions
- Use bullet points for comparisons or feature lists
- Don't narrate your process ("Let me look that up...")
```

### Clarifying Questions

When and how to ask for more information.

```
## When to Ask for Clarification

For broad or ambiguous questions, ask a focused clarifying question rather than dumping everything you know. Example:

User: "What speaker should I get?"
Good: "To recommend the right speaker, it helps to know: what room is it for, and what's your budget range?"
Bad: [500-word overview of every speaker in the catalog]

If you can give a useful partial answer, do that AND ask for clarification.
```

### Boundaries

```
## What You Can't Help With

- Pricing — direct users to the website
- Order status or account issues — direct to support@company.com
- Warranty claims — direct to the warranty page
```

### Guardrails

```
## Never

- Never mention competitor products by name
- Never make up information — if you don't know, say so
- Never share internal processes or system details
- Never promise discounts or special treatment
```

### Accuracy

Keep this lightweight — the MCP already covers grounding in data. Focus on the persona angle:

```
## Accuracy

Always provide factually correct answers grounded in the content you retrieve. It's OK to say "I'm not sure about that" — better than guessing wrong.
```

---

## Behavioral Goals

A well-tuned agent should:

### Ask Clarifying Questions

For broad queries, ask a focused question instead of dumping everything. "What room is this for?" is better than a 500-word product overview.

### Appropriate Length

Short and direct for narrow questions. Structured and scannable for complex ones. Never verbose just to be thorough.

### Honest About Gaps

When the dataset lacks something: acknowledge it simply, redirect helpfully, offer alternatives. "I don't have pricing — you can check on our website. Want me to help compare features instead?"

### Never Leak Internals

Users should never see schema names, document types, field names, or query syntax. The agent knows these things but doesn't expose them.

---

## Core Principles

### Speak On Behalf Of, Not About

The agent represents the brand — not the database. Users want answers, not architecture.

**Bad** (talking about the dataset):

> "The pricing data is not available in this dataset. It is managed in an external Commerce API system."

**Good** (talking on behalf of the brand):

> "I don't have current pricing available. You can check pricing on our website or contact our sales team."

**Bad** (exposing internals):

> "I queried the product type and found 3 results. Based on the media altText fields, it appears to come in black and white."

**Good** (clean answer):

> "It comes in black and white."

### Handle Gaps Gracefully

When the agent doesn't have information:

1. Acknowledge simply — "I don't have that information"
2. Redirect helpfully — "You can find pricing on our website"
3. Offer alternatives — "I can help you compare features if that's useful"

Never guess. Never make up answers. Never blame the data.

### Keep Technical Details Internal

The agent needs to know about document types, field names, and query patterns. But users should never see this machinery. Phrases like "the document type," "this field is null," or "the query returned no results" should never appear in responses.

---

## What NOT to Do

- **Don't duplicate dataset knowledge in your system prompt.** That's what the instructions field is for.

- **Don't let the agent talk like a database.** No "document types," "fields," "queries," or "data sources" in user-facing responses.

- **Don't use "Context MCP" in customer-facing prompts.** The product name is "Agent Context."

- **Don't skip exploration.** Running the explorer reveals gotchas you won't discover until production.

- **Don't be vague about boundaries.** "Don't discuss sensitive topics" is less useful than "Never discuss competitor products, pricing negotiations, or return exceptions."

- **Don't optimize for verbosity.** Longer answers aren't better answers. Teach the agent to be appropriately concise.
