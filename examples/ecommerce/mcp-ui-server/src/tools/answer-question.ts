/**
 * answer_question — General Q&A about products, materials, sizing, or the store.
 *
 * Text-only tool (no UI). Uses semantic search across all content
 * to find relevant information, then returns text for the LLM to narrate.
 */

import {callUpstream} from '../upstream.js'

interface AnswerQuestionInput {
  question: string
}

export async function handleAnswerQuestion(input: AnswerQuestionInput) {
  const {question} = input

  // Search across product-related content using semantic search
  const groq = `*[_type in ["product", "category", "brand", "material"]]
    | score(text::embedding($question))
    | order(_score desc)
    {
      _id, _type, title,
      _type == "product" => {
        shortDescription, price { amount },
        "category": category->title,
        features, tags,
        "materials": materials[]->title
      },
      _type == "category" => { description },
      _type == "brand" => { description },
      _type == "material" => { composition }
    }[0...5]`

  const result = await callUpstream('groq_query', {
    query: groq,
    params: {question},
  })

  const textContent = result.content?.find((c: {type: string}) => c.type === 'text')
  let documents: Array<Record<string, unknown>> = []
  if (textContent && 'text' in textContent) {
    try {
      const parsed = JSON.parse(textContent.text as string)
      documents = Array.isArray(parsed) ? parsed : []
    } catch {
      /* empty */
    }
  }

  // Format results as text context for the LLM
  const context = documents
    .map((doc) => {
      const parts = [`[${doc._type}] ${doc.title || 'Untitled'}`]
      if (doc.shortDescription) parts.push(`  ${doc.shortDescription}`)
      if (doc.description) parts.push(`  ${doc.description}`)
      if (doc.composition) parts.push(`  Composition: ${doc.composition}`)
      if (doc.price) {
        const price = doc.price as {amount?: number}
        parts.push(`  Price: $${price.amount}`)
      }
      if (doc.features) parts.push(`  Features: ${(doc.features as string[]).join(', ')}`)
      if (doc.materials) parts.push(`  Materials: ${(doc.materials as string[]).join(', ')}`)
      return parts.join('\n')
    })
    .join('\n\n')

  return {
    content: [
      {
        type: 'text' as const,
        text: context
          ? `Here is relevant information to answer the question "${question}":\n\n${context}`
          : `No relevant information found for "${question}". Try asking about specific products, materials, or categories.`,
      },
    ],
    // No structuredContent — this is text-only, no widget
  }
}
