import type { NutStrength } from '@shared/engine'

interface HandStrengthProps {
  /** What my cards make, like "Two Pair, K's & 7's". */
  name: string
  /** How close the hand is to the nuts. Null before the flop, or when the table doesn't show it. */
  nut?: NutStrength | null
}

/**
 * What you have, and (if the host turned it on) the nut meter: a bar that fills as your hand
 * gets closer to the best possible hand on this board, going from red to green. Full and green
 * means you have the nuts. Only you see it: it comes from your private document.
 */
export function HandStrength({ name, nut = null }: HandStrengthProps) {
  return (
    <div
      className="glass-dark short:py-1 landscape-phone:py-1 w-full max-w-md rounded-2xl px-3 py-2"
      aria-live="polite"
    >
      <p className="text-sm font-semibold">{name}</p>
      {nut && <NutMeter nut={nut} />}
    </div>
  )
}

/**
 * Your step on the ladder of different hands this board allows, as a bar. The colour slides
 * from red (far from the nuts) through gold to green (the nuts). The server re-computes it as
 * each card comes, so it moves with the board.
 */
function NutMeter({ nut }: { nut: NutStrength }) {
  const isNuts = nut.ahead === 0
  const score = isNuts ? 1 : nut.score
  // Hue 0 is red, 130 is green; the gold-ish middle comes for free on the way.
  const hue = Math.round(score * 130)
  return (
    <div
      className="short:mt-1 landscape-phone:mt-1 mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
      role="meter"
      aria-label={isNuts ? 'Nut meter: you have the nuts' : 'Nut meter'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(score * 100)}
    >
      <div
        className="h-full rounded-full transition-[width,background-color,box-shadow] duration-700 ease-out"
        style={{
          width: `${Math.max(4, score * 100)}%`,
          backgroundColor: `hsl(${hue} 70% 50%)`,
          boxShadow: isNuts ? `0 0 12px hsl(${hue} 70% 50% / 0.8)` : undefined,
        }}
      />
    </div>
  )
}
