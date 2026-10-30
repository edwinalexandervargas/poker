interface PotDisplayProps {
  /** Chips collected from finished betting rounds. */
  pot: number
}

export function PotDisplay({ pot }: PotDisplayProps) {
  return (
    // Under the board: the pot's total. Sized in units of the table's width
    // (cqw), so it grows and shrinks with the table.
    <div className="flex items-center gap-[clamp(0.25rem,1.2cqw,0.6rem)]">
      <div className="glass-dark flex items-baseline gap-[clamp(0.25rem,1.2cqw,0.5rem)] rounded-full px-[clamp(0.5rem,2.2cqw,1rem)] py-[clamp(0.1rem,0.7cqw,0.375rem)]">
        <span className="text-[clamp(0.55rem,1.8cqw,0.75rem)] font-medium text-white/60">
          Pot
        </span>
        <span className="text-[clamp(0.8rem,3cqw,1.125rem)] font-bold tracking-tight">
          {pot.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
