# Sanity Agent Context

> **Alpha**: This project is currently in invite-only alpha. All APIs and interfaces are subject to change.

## What is this?

This repository contains packages (studio plugin, an agent skill, and a demo) for building/connecting AI agents to Sanity content via Agent Context MCP tools.

## Getting Started

The recommended way to get started is to install the studio plugin and use it with the skill using a frontier model (e.g., Claude Opus 4.5):

1. Install the `@sanity/agent-context` plugin into your Sanity Studio
2. Install the agent-context skill in your chosen IDE / CLI tool
3. Prompt using AI with access to your studio e.g. "Help me set up Sanity agent context MCP in this repo using the agent-context skill"

### Install the Skill

```bash
npx skills add https://github.com/sanity-io/agent-context
```

Or manually copy from [`skills/create-agent-with-sanity-context`](./skills/create-agent-with-sanity-context).

## Repository Structure

### Packages

| Package                                             | Description                                                  |
| --------------------------------------------------- | ------------------------------------------------------------ |
| [`@sanity/agent-context`](./packages/agent-context) | Sanity Studio plugin for managing AI agent context documents |

### Skills

| Skill                                                                           | Description                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`create-agent-with-sanity-context`](./skills/create-agent-with-sanity-context) | Agent skill for building AI agents with Sanity Context |

### Sandboxes

| Sandbox                                | Description                                |
| -------------------------------------- | ------------------------------------------ |
| [`dev-studio`](./sandboxes/dev-studio) | Development sandbox for testing the plugin |

### Examples

| Example                             | Description                                                      |
| ----------------------------------- | ---------------------------------------------------------------- |
| [`ecommerce`](./examples/ecommerce) | Demo Next.js e-commerce app with AI chat—reference for the skill |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development mode
pnpm dev

# Run tests
pnpm test:unit

# Type check
pnpm check:types

# Lint
pnpm check:lint
```
