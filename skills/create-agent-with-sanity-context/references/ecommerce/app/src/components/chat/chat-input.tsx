import {Send, Square} from 'lucide-react'

import {Button} from '@/components/ui/button'

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  disabled: boolean
}

export function ChatInput(props: ChatInputProps) {
  const {input, setInput, onSubmit, disabled} = props

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="How can I help?"
        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        disabled={disabled}
      />

      <Button type="submit" size="icon" disabled={disabled || !input.trim()}>
        {disabled ? <Square className="h-3 w-3" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  )
}
