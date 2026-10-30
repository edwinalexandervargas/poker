import type { NutStrength } from '@shared/engine'

interface HandStrengthProps {
  /** What my cards make, like "Two Pair, K's & 7's". */
  name: string
  /** Rough chance of winning, 0 to 1. Null when the table doesn't show strength. */
  equity: number | null
  /** How close the hand is to the nuts right now. Null before the flop, or when it's off. */
  nut?: NutStrength | null
}

/** Red when weak, gold in the middle, green when strong. */
function barColor(equity: number): string {
  if (equity < 0.3) return 'from-[#b9343b] to-[#e2585e]'
  if (equity < 0.6) return 'from-[#d4a945] to-[#f0d27f]'
  return 'from-[#1f8a52] to-[#3fc47d]'
}

/**
 * What you have, and (if the host turned it on) a bar showing your rough chance of winning if
 * everyone still in went to showdown. Only you see it: it comes from your private document.
 */
export function HandStrength({ name, equity, nut = null }: HandStrengthProps) {
  // The estimate is a simulation, so show it in steps of 5% rather than false precision.
  const percent = equity === null ? null : Math.round((equity * 100) / 5) * 5

  return (
    <div
      className="glass-dark short:py-1 landscape-phone:py-1 w-full max-w-md rounded-2xl px-3 py-2"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{name}</span>
        {percent !== null && (
          <span className="text-xs text-white/60">
            ≈ {percent}% to win
            {/* On short or sideways screens the nut meter's own label line is dropped to
                save height, so its summary joins this line instead. */}
            {nut && (
              <span className="short:inline landscape-phone:inline hidden">
                {' · '}
                {nut.better === 0 ? (
                  <span className="font-bold text-[#e3be62]">the nuts</span>
                ) : (
                  `${nut.better.toLocaleString()} beat you`
                )}
              </span>
            )}
          </span>
        )}
      </div>
      {equity !== null && (
        <div
          className="short:mt-1 landscape-phone:mt-1 mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
          role="meter"
          aria-label="Hand strength"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? 0}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out ${barColor(equity)}`}
            style={{ width: `${Math.max(3, equity * 100)}%` }}
          />
        </div>
      )}
      {nut && <NutMeter nut={nut} />}
    </div>
  )
}

/**
 * How close you are to the best possible hand on this board. Full when nothing an opponent
 * could hold beats you (the nuts), including when the board itself is the best hand.
 */
function NutMeter({ nut }: { nut: NutStrength }) {
  const isNuts = nut.better === 0
  const fill = isNuts ? 100 : Math.max(3, nut.score * 100)
  return (
    <div className="short:mt-1 landscape-phone:mt-1 mt-2">
      <div className="short:hidden landscape-phone:hidden flex items-baseline justify-between gap-3 text-xs">
        <span className="text-white/60">Nut meter</span>
        <span className={isNuts ? 'font-bold text-[#e3be62]' : 'text-white/60'}>
          {isNuts
            ? 'You have the nuts'
            : `${nut.better.toLocaleString()} ${nut.better === 1 ? 'hand beats' : 'hands beat'} you`}
        </span>
      </div>
      <div
        className="short:mt-0 landscape-phone:mt-0 mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-label="Nut meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill)}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r from-[#8a6417] to-[#f0d27f] transition-[width] duration-700 ease-out ${
            isNuts ? 'shadow-[0_0_12px_rgb(227_190_98/0.8)]' : ''
          }`}
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  )
}
