interface PotDisplayProps {
  /** Chips collected from finished betting rounds. */
  pot: number
}

/**
 * Under the board: the pot's total, with a small pile of chips. Sized in units of the table's
 * width (cqw), so it grows and shrinks with the table. Hidden while the pot is empty.
 */
export function PotDisplay({ pot }: PotDisplayProps) {
  if (pot <= 0) return null
  return (
    <div className="glass-dark flex items-center gap-[0.45em] rounded-full py-[0.3em] pr-[0.8em] pl-[0.35em] text-[clamp(0.72rem,2.4cqw,1.05rem)] whitespace-nowrap">
      <span className="relative flex h-[1.3em] w-[1.9em]" aria-hidden>
        <span
          className="chip-token absolute top-[0.15em] left-0 text-[1.1em]"
          style={{ ['--chip' as string]: '#6aa8ff' }}
        />
        <span
          className="chip-token absolute top-0 left-[0.4em] text-[1.1em]"
          style={{ ['--chip' as string]: '#f27fb8' }}
        />
        <span className="chip-token absolute top-[0.2em] left-[0.8em] text-[1.1em]" />
      </span>
      <span className="text-muted text-[0.8em] font-medium">Pot</span>
      <span className="font-num leading-none">{pot.toLocaleString()}</span>
    </div>
  )
}
