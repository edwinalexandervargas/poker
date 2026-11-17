/** "+880": what a player won in the hand that just ended, over their name plate. */
export function WonBadge({
  amount,
  className = '',
}: {
  amount: number
  className?: string
}) {
  return (
    <span
      className={`font-num bg-brass z-20 rounded-full px-2 py-0.5 text-xs whitespace-nowrap text-[#1d1404] shadow-[0_4px_12px_rgb(245_184_61/0.35)] ${className}`}
    >
      +{amount.toLocaleString()}
    </span>
  )
}
