import { ChipStack } from '@/components/ChipStack'

interface PotDisplayProps {
  /** Chips collected from finished betting rounds. */
  pot: number
}

export function PotDisplay({ pot }: PotDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Reserve the height so the board doesn't jump when the pot first appears. */}
      <div className="flex h-12 items-end">
        <ChipStack amount={pot} size="sm" />
      </div>
      <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-1.5">
        <span className="text-sm text-white/70">Pot</span>
        <span className="font-bold">{pot.toLocaleString()}</span>
      </div>
    </div>
  )
}
