import type { Action } from '@shared/engine'
import { CHIP_UNIT } from '@shared/engine/types'
import type { BettingOptions } from '@/lib/betting'
import { useUiStore } from '@/store/ui'

interface ActionBarProps {
  options: BettingOptions
  /** Only the player whose turn it is can act. */
  disabled: boolean
  /** The bar never changes the game itself. It just reports what the player chose. */
  onAction: (action: Action) => void
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

export function ActionBar({ options, disabled, onAction }: ActionBarProps) {
  const {
    toCall,
    canCheck,
    canRaise,
    minRaiseTo,
    maxRaiseTo,
    halfPotRaiseTo,
    potRaiseTo,
  } = options

  // The raise amount is UI-only state (Zustand). It is clamped on every render, so it
  // can never sit outside what is legal even if the table changes underneath it.
  const pendingBet = useUiStore((s) => s.pendingBet)
  const setPendingBet = useUiStore((s) => s.setPendingBet)
  const raiseTo = clamp(pendingBet || minRaiseTo, minRaiseTo, maxRaiseTo)

  const quickBets = [
    { label: '½ pot', value: halfPotRaiseTo },
    { label: 'Pot', value: potRaiseTo },
    { label: 'All-in', value: maxRaiseTo },
  ]

  return (
    <div
      className="glass flex w-full max-w-md flex-col gap-4 rounded-3xl p-4"
      aria-label="Your actions"
    >
      {/* Raise slider and quick-bet buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Raise to</span>
          <span className="text-2xl font-bold tracking-tight">
            {raiseTo.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={minRaiseTo}
          max={maxRaiseTo}
          step={CHIP_UNIT}
          value={raiseTo}
          disabled={disabled || !canRaise || minRaiseTo >= maxRaiseTo}
          onChange={(e) => setPendingBet(Number(e.target.value))}
          className="slider w-full"
          aria-label="Raise amount"
        />
        <div className="flex gap-2">
          {quickBets.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => setPendingBet(value)}
              className="btn btn-ghost flex-1 !py-1.5 text-sm"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* The three actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction({ type: 'fold' })}
          className="btn btn-fold !px-2"
        >
          Fold
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction(canCheck ? { type: 'check' } : { type: 'call' })}
          className="btn btn-call !px-2"
        >
          {canCheck ? 'Check' : `Call ${toCall.toLocaleString()}`}
        </button>
        <button
          type="button"
          disabled={disabled || !canRaise}
          onClick={() => onAction({ type: 'raise', amount: raiseTo })}
          className="btn btn-gold !px-2"
        >
          Raise
        </button>
      </div>
    </div>
  )
}
