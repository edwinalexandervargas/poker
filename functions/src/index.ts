import { initializeApp } from 'firebase-admin/app'
import { onCall } from 'firebase-functions/v2/https'
import { createDeck, shuffle } from '../../shared/engine/index.js'

initializeApp()

/**
 * Smoke test for the emulator setup. Proves that:
 *  1. the callable function runs,
 *  2. it can import the shared engine,
 *  3. the client can call it through the Functions emulator.
 * Real game functions (createRoom, joinRoom, startHand, submitAction, ...) come next.
 */
export const ping = onCall(() => {
  const deck = shuffle(createDeck())
  return { ok: true, deckSize: deck.length, time: new Date().toISOString() }
})
