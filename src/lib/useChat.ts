import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { ChatMessage } from '@shared/engine'
import { CHAT_HISTORY } from '@shared/engine/chat'
import { db } from '@/lib/db'

export type ChatLine = ChatMessage & { id: string }

/** Follows the table's chat live: the newest CHAT_HISTORY messages, oldest first. */
export function useChat(code: string): ChatLine[] {
  const [messages, setMessages] = useState<ChatLine[]>([])

  useEffect(() => {
    const newest = query(
      collection(db, 'rooms', code, 'chat'),
      orderBy('at', 'desc'),
      limit(CHAT_HISTORY),
    )
    return onSnapshot(
      newest,
      (snap) =>
        setMessages(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChatMessage) })).reverse(),
        ),
      // Chat is a nice-to-have: if it can't load, the game still works.
      () => setMessages([]),
    )
  }, [code])

  return messages
}
