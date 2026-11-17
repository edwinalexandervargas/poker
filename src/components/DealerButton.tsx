/** The dealer button: a white puck with a D, like the real one. */
export function DealerButton({ className = 'size-6 text-xs' }: { className?: string }) {
  return (
    <span
      className={`font-num flex items-center justify-center rounded-full bg-gradient-to-b from-white to-[#d9dee6] text-[#141a26] shadow-[0_2px_6px_rgb(0_0_0/0.5),inset_0_-1px_0_rgb(0_0_0/0.15)] ${className}`}
      title="Dealer button"
    >
      D
    </span>
  )
}
