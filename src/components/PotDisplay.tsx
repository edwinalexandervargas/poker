import { ChipStack } from '@/components/ChipStack'

interface PotDisplayProps {
  /** Chips collected from finished betting rounds. */
  pot: number
}

export function PotDisplay({ pot }: PotDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Reserve the height so the board doesn't jump when the pot first appears. */}
      <div className="flex h-8 items-end sm:h-12">
        <ChipStack amount={pot} size="sm" />
      </div>
      <div className="glass-dark flex items-baseline gap-2 rounded-full px-4 py-1.5">
        <span className="text-xs font-medium text-white/60">Pot</span>
        <span className="text-lg font-bold tracking-tight">{pot.toLocaleString()}</span>
      </div>
    </div>
  )
}
