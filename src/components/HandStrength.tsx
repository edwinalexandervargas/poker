interface HandStrengthProps {
  /** What my cards make, like "Two Pair, K's & 7's". */
  name: string
  /** Rough chance of winning, 0 to 1. Null when the table doesn't show strength. */
  equity: number | null
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
export function HandStrength({ name, equity }: HandStrengthProps) {
  // The estimate is a simulation, so show it in steps of 5% rather than false precision.
  const percent = equity === null ? null : Math.round((equity * 100) / 5) * 5

  return (
    <div
      className="glass-dark short:py-1.5 w-full max-w-md rounded-2xl px-3 py-2"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{name}</span>
        {percent !== null && (
          <span className="text-xs text-white/60">≈ {percent}% to win</span>
        )}
      </div>
      {equity !== null && (
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
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
    </div>
  )
}
