import { useState } from 'react'
import type { Phase, Seat } from '@shared/engine'
import { dealPlan, type DealPlan } from '@/lib/deal'

/**
 * Decides, once per hand, whether the deal should be animated.
 *
 *  - A hand that appears while this screen is already open is always dealt on screen.
 *  - The FIRST hand this screen sees is only dealt if it is just beginning (preflop). Someone
 *    who reloads the page at the river should simply see the table, not a replay of the deal.
 *
 * Returns the plan for the current hand, or null for "just show the cards".
 */
export function useDealPlan(
  handNumber: number | undefined,
  phase: Phase,
  button: Seat | undefined,
  dealtIn: readonly boolean[],
): DealPlan | null {
  const [decided, setDecided] = useState<{ hand: number; plan: DealPlan | null } | null>(
    null,
  )

  if (handNumber !== undefined && button !== undefined && decided?.hand !== handNumber) {
    const firstEverSeen = decided === null
    const plan = firstEverSeen && phase !== 'preflop' ? null : dealPlan(button, dealtIn)
    // Setting state while rendering is allowed for values worked out from props: React
    // simply renders again straight away with the new value.
    setDecided({ hand: handNumber, plan })
    return plan
  }
  return decided?.plan ?? null
}
