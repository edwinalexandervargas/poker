// Turning untrusted input from a browser into a real Action.
// Pure game logic: no React, no Firebase.
//
// Anything a browser sends to a Cloud Function can be anything: a typo, a string where a
// number should be, or something a cheater made up. The server must check it before the
// engine ever sees it.

import type { Action } from './types.js'

/**
 * YOUR TURN: make the tests in parseAction.test.ts pass.  Run them with:  npm run test:watch
 *
 * Return a clean Action if `input` is a valid one, or null if it is not.
 *
 *   - It must be an object (and not null).
 *   - Its `type` must be exactly 'fold', 'check', 'call' or 'raise'.
 *   - A 'raise' must also have an `amount` that is a whole number bigger than 0.
 *   - The result contains ONLY the fields of a real Action. Anything extra the browser
 *     sent is thrown away (build a fresh object, don't return the input).
 *
 * Hints:
 *   typeof input === 'object' && input !== null     checks "an object, and not null"
 *   Number.isInteger(x)                             is true only for whole numbers
 *                                                   (false for strings, NaN, Infinity, 1.5)
 *   `unknown` means TypeScript won't let you read fields until you check; this line
 *   is allowed:  const { type, amount } = input as { type?: unknown; amount?: unknown }
 */
export function parseAction(input: unknown): Action | null {
  if (typeof input !== 'object' || input === null) {
    return null
  }

  const { type, amount } = input as { type?: unknown; amount?: unknown }

  switch (type) {
    case 'fold':
      return { type: 'fold' }
    case 'check':
      return { type: 'check' }
    case 'call':
      return { type: 'call' }
    case 'raise':
      if (typeof amount === 'number' && Number.isInteger(amount) && amount > 0) {
        return { type: 'raise', amount }
      }
      return null
    default:
      return null
  }
}