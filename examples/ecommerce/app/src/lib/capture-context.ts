import html2canvas from 'html2canvas-pro'
import TurndownService from 'turndown'

import type {DocumentContext} from './client-tools'

export const AGENT_CHAT_HIDDEN_ATTRIBUTE = 'agent-chat-hidden'

/**
 * Captures the document context (title, description, pathname).
 */
export function getDocumentContext(): DocumentContext {
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content')

  return {
    title: document.title,
    description: description || undefined,
    pathname: window.location.pathname + window.location.search + window.location.hash,
  }
}

/**
 * Extracts page content as markdown (up to 4000 chars).
 */
export function getPageContent(): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
  })

  turndown.addRule('removeNoise', {
    filter: (node) =>
      ['SCRIPT', 'STYLE', 'SVG', 'VIDEO', 'AUDIO', 'IFRAME', 'NOSCRIPT', 'IMG'].includes(
        node.nodeName,
      ),
    replacement: () => '',
  })

  const main = document.querySelector('main') || document.body
  const clone = main.cloneNode(true) as Element
  clone.querySelectorAll(`[${AGENT_CHAT_HIDDEN_ATTRIBUTE}]`).forEach((el) => el.remove())

  return turndown.turndown(clone.innerHTML).slice(0, 4000)
}

/**
 * Captures page screenshot as base64 JPEG.
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
