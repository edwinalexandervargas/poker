import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MAX_CHAT_LENGTH } from '@shared/engine/chat'
import type { ChatLine } from '@/lib/useChat'

interface ChatPanelProps {
  messages: ChatLine[]
  mySeat: number
  /** Sends a message. Rejects with a friendly error if the server refuses it. */
  onSend: (text: string) => Promise<void>
}

const timeOf = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** The table chat: messages (yours on the right), and a box to write a new one. */
export function ChatPanel({ messages, mySeat, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLLIElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      await onSend(text)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <p className="py-6 text-center text-white/50">No messages yet. Say hi!</p>
      ) : (
        <ol className="flex flex-col gap-2" aria-live="polite">
          {messages.map((m, i) => {
            const mine = m.seat === mySeat
            return (
              <li
                key={m.id}
                ref={i === messages.length - 1 ? endRef : undefined}
                className={`flex max-w-[85%] flex-col ${mine ? 'items-end self-end' : 'items-start'}`}
              >
                {!mine && (
                  <span className="mb-0.5 px-1 text-xs text-white/50">{m.name}</span>
                )}
                <span
                  className={`rounded-2xl px-3 py-2 text-sm break-words ${
                    mine
                      ? 'rounded-br-md bg-gradient-to-b from-[#f0d27f] to-[#d4a945] text-[#1c1405]'
                      : 'rounded-bl-md bg-white/10'
                  }`}
                >
                  {m.text}
                </span>
                <span className="mt-0.5 px-1 text-[0.65rem] text-white/35">
                  {timeOf(m.at)}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <form onSubmit={send} className="sticky bottom-0 flex gap-2 pt-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_CHAT_LENGTH}
          placeholder="Message the table"
          aria-label="Chat message"
          enterKeyHint="send"
          className="field min-w-0 flex-1 !py-2.5"
        />
        <button
          type="submit"
          disabled={sending || draft.trim() === ''}
          className="btn btn-gold !px-4 !py-2.5"
        >
          Send
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
