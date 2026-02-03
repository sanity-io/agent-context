'use client'

import {MessageCircle, X} from 'lucide-react'
import {useState} from 'react'

import {Chat} from './Chat'

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <div
        className={`
          mb-4 h-[500px] w-[380px] transition-all duration-300 ease-out origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}
        `}
      >
        <Chat onClose={() => setIsOpen(false)} />
      </div>

      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <div className="relative h-6 w-6">
          <MessageCircle
            className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
          />

          <X
            className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}
          />
        </div>
      </button>
    </div>
  )
}
