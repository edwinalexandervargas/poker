import { useEffect, useRef } from 'react'
import type { Action } from '@shared/engine'
import { CHIP_UNIT } from '@shared/engine/types'
import { stepBet, type BettingOptions } from '@/lib/betting'
import { useUiStore } from '@/store/ui'

interface ActionBarProps {
  options: BettingOptions
  /** Only the player whose turn it is can act. */
  disabled: boolean
  /** The bar never changes the game itself. It just reports what the player chose. */
  onAction: (action: Action) => void
  /** For showing the bet in big blinds. */
  bigBlind?: number
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/**
 * Hold-to-repeat for the − and + buttons: one step on press, then repeating faster the longer
 * it's held. Returns pointer handlers to spread on the button.
 */
function useRepeat(step: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  })
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => stop, [])
  const start = () => {
    stop()
    stepRef.current()
    let delay = 380
    const tick = () => {
      stepRef.current()
      delay = Math.max(45, delay * 0.8)
      timer.current = setTimeout(tick, delay)
    }
    timer.current = setTimeout(tick, delay)
  }
  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  }
}

export function ActionBar({
  options,
  disabled,
  onAction,
  bigBlind = 20,
}: ActionBarProps) {
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

  const sizingOff = disabled || !canRaise || minRaiseTo >= maxRaiseTo
  const step = (delta: number) =>
    setPendingBet(stepBet(raiseTo, delta, minRaiseTo, maxRaiseTo))
  const minus = useRepeat(() => step(-CHIP_UNIT))
  const plus = useRepeat(() => step(CHIP_UNIT))

  // Scrolling over the slider moves it one chip per notch, without scrolling the page. React's
  // onWheel can't stop the page scrolling (it's a passive listener), so this one is added by hand.
  const sliderRef = useRef<HTMLInputElement>(null)
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = sizingOff ? () => {} : step
  })
  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) return
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault()
      stepRef.current(e.deltaY < 0 || e.deltaX > 0 ? CHIP_UNIT : -CHIP_UNIT)
    }
    slider.addEventListener('wheel', onWheel, { passive: false })
    return () => slider.removeEventListener('wheel', onWheel)
  }, [])

  const fill =
    maxRaiseTo > minRaiseTo
      ? ((raiseTo - minRaiseTo) / (maxRaiseTo - minRaiseTo)) * 100
      : 100
  const allIn = raiseTo === maxRaiseTo
  const raiseLabel = allIn
    ? `All-in ${raiseTo.toLocaleString()}`
    : `${canCheck ? 'Bet' : 'Raise to'} ${raiseTo.toLocaleString()}`

  const quickBets = [
    { label: 'Min', value: minRaiseTo },
    { label: '½ Pot', value: halfPotRaiseTo },
    { label: 'Pot', value: potRaiseTo },
    { label: 'All-in', value: maxRaiseTo },
  ]

  return (
    <div
      className="glass flex w-full max-w-md flex-col gap-4 rounded-3xl p-4"
      aria-label="Your actions"
    >
      {/* Sizing: the amount, −/+ and the slider. */}
      <div className={`flex flex-col gap-3 ${sizingOff ? 'opacity-45' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={sizingOff || raiseTo <= minRaiseTo}
            aria-label={`Lower the bet by ${CHIP_UNIT}`}
            className="btn btn-ghost flex size-11 shrink-0 items-center justify-center !p-0 text-2xl leading-none"
            {...minus}
          >
            −
          </button>
          <div className="text-center" aria-live="polite">
            <p className="text-[2.1rem] leading-none font-bold tracking-[-0.04em]">
              {raiseTo.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {canCheck ? 'Bet' : 'Raise to'} ·{' '}
              {(raiseTo / bigBlind).toFixed(raiseTo % bigBlind ? 1 : 0)} BB
            </p>
          </div>
          <button
            type="button"
            disabled={sizingOff || raiseTo >= maxRaiseTo}
            aria-label={`Raise the bet by ${CHIP_UNIT}`}
            className="btn btn-ghost flex size-11 shrink-0 items-center justify-center !p-0 text-2xl leading-none"
            {...plus}
          >
            +
          </button>
        </div>

        <input
          type="range"
          min={minRaiseTo}
          max={maxRaiseTo}
          step={CHIP_UNIT}
          value={raiseTo}
          disabled={sizingOff}
          onChange={(e) =>
            setPendingBet(stepBet(Number(e.target.value), 0, minRaiseTo, maxRaiseTo))
          }
          ref={sliderRef}
          className="slider my-1.5 w-full"
          style={{ ['--fill' as string]: `${fill}%` }}
          aria-label="Bet amount"
        />

        <div className="grid grid-cols-4 gap-1.5">
          {quickBets.map(({ label, value }) => {
            const active = !sizingOff && raiseTo === value
            return (
              <button
                key={label}
                type="button"
                disabled={sizingOff}
                onClick={() => setPendingBet(value)}
                aria-pressed={active}
                className={`rounded-full border py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                } disabled:cursor-not-allowed`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* The three actions. */}
      <div className="grid grid-cols-[1fr_1.15fr_1.35fr] gap-2">
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
          className="btn btn-gold !px-2 whitespace-nowrap"
        >
          {raiseLabel}
        </button>
      </div>
    </div>
  )
}
