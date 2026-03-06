/**
 * Browser-specific context capture functions for the agent.
 * For types and constants, see ./client-tools.ts
 */

import html2canvas from 'html2canvas-pro'
import TurndownService from 'turndown'

import type {UserContext} from './client-tools'

/**
 * Attribute to mark the agent chat element (excluded from capture)
 */
export const AGENT_CHAT_HIDDEN_ATTRIBUTE = 'agent-chat-hidden'

/**
 * Captures lightweight user context.
 * This is sent with every message so the agent knows where the user is.
 */
export function captureUserContext(): UserContext {
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content')

  return {
    documentTitle: document.title,
    documentDescription: description || undefined,
    documentLocation: window.location.pathname,
  }
}

/**
 * Captures page context for the agent as markdown.
 */
export function capturePageContext() {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
  })

  // Remove non-text elements
  turndown.addRule('removeNoise', {
    filter: (node) =>
      ['SCRIPT', 'STYLE', 'SVG', 'VIDEO', 'AUDIO', 'IFRAME', 'NOSCRIPT', 'IMG'].includes(
        node.nodeName,
      ),
    replacement: () => '',
  })

  const main = document.querySelector('main') || document.body
  const clone = main.cloneNode(true) as Element

  // Remove agent chat from the clone
  clone.querySelectorAll(`[${AGENT_CHAT_HIDDEN_ATTRIBUTE}]`).forEach((el) => el.remove())

  return {
    url: window.location.href,
    title: document.title,
    content: turndown.turndown(clone.innerHTML).slice(0, 4000),
  }
}

/**
 * Screenshot capture for visual context
 */
export async function captureScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body, {
    ignoreElements: (el) => el.hasAttribute(AGENT_CHAT_HIDDEN_ATTRIBUTE),
  })

  const MAX_DIMENSION = 4000

  // Resize if needed to prevent payload size limit
  if (canvas.width > MAX_DIMENSION || canvas.height > MAX_DIMENSION) {
    const scale = Math.min(MAX_DIMENSION / canvas.width, MAX_DIMENSION / canvas.height)
    const resized = document.createElement('canvas')
    resized.width = Math.floor(canvas.width * scale)
    resized.height = Math.floor(canvas.height * scale)
    resized.getContext('2d')?.drawImage(canvas, 0, 0, resized.width, resized.height)
    return resized.toDataURL('image/jpeg', 0.7)
  }

  return canvas.toDataURL('image/jpeg', 0.7)
}
