/**
 * Client tool definitions - shared between server and client.
 * No browser-specific code, safe to import anywhere.
 */

/** User context sent with every message so the agent knows where the user is. */
export interface UserContext {
  documentTitle: string
  documentLocation: string
}

/** Tool names - single source of truth for definitions (route.ts) and handlers (Chat.tsx). */
export const CLIENT_TOOLS = {
  PAGE_CONTEXT: 'get_page_context',
  SCREENSHOT: 'get_page_screenshot',
} as const

export type ClientToolName = (typeof CLIENT_TOOLS)[keyof typeof CLIENT_TOOLS]
