import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MAX_CHAT_LENGTH } from '@shared/engine/chat'
import { Avatar } from '@/components/Avatar'
import { SendIcon } from '@/components/Icons'
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
        <p className="text-muted py-6 text-center">
          No messages yet. Say hi to the table.
        </p>
      ) : (
        <ol className="flex flex-col gap-2" aria-live="polite">
          {messages.map((m, i) => {
            const mine = m.seat === mySeat
            // A run of messages from the same person shows their avatar and name once.
            const sameAsBefore = messages[i - 1]?.seat === m.seat
            return (
              <li
                key={m.id}
                ref={i === messages.length - 1 ? endRef : undefined}
                className={`flex max-w-[85%] items-end gap-2 ${mine ? 'self-end' : ''} ${sameAsBefore ? '-mt-1' : ''}`}
              >
                {!mine && (
                  <span className="w-7 shrink-0">
                    {!sameAsBefore && (
                      <Avatar name={m.name} seat={m.seat} className="size-7 text-xs" />
                    )}
                  </span>
                )}
                <span className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && !sameAsBefore && (
                    <span className="text-muted mb-0.5 px-1 text-xs">{m.name}</span>
                  )}
                  <span
                    className={`rounded-2xl px-3 py-2 text-sm break-words ${
                      mine
                        ? 'bg-brass rounded-br-md text-[#1d1404]'
                        : 'bg-surface-2 rounded-bl-md'
                    }`}
                  >
                    {m.text}
                  </span>
                  <span className="text-muted/80 mt-0.5 px-1 text-[0.65rem]">
                    {timeOf(m.at)}
                  </span>
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
          className="field min-w-0 flex-1 !rounded-full !py-2.5"
        />
        <button
          type="submit"
          disabled={sending || draft.trim() === ''}
          className="btn btn-gold !rounded-full !px-3.5 !py-2.5"
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </form>
      {error && (
        <p role="alert" className="text-fold text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
