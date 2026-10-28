interface PotDisplayProps {
  /** Chips collected from finished betting rounds. */
  pot: number
}

export function PotDisplay({ pot }: PotDisplayProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-1.5">
      <span
        className="bg-chip-gold size-4 rounded-full ring-2 ring-white/60"
        aria-hidden
      />
      <span className="text-sm text-white/70">Pot</span>
      <span className="font-bold">{pot.toLocaleString()}</span>
    </div>
  )
}
