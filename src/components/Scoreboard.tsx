import type { Standing } from '@shared/engine'
import { Avatar } from '@/components/Avatar'

interface ScoreboardProps {
  rows: Standing[]
  mySeat: number
}

const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString())

/**
 * Who's up and who's down tonight, counting rebuys, best first. Numbers update when each
 * hand ends.
 */
export function Scoreboard({ rows, mySeat }: ScoreboardProps) {
  return (
    <table className="w-full border-separate border-spacing-y-1.5 text-sm">
      <thead className="text-muted text-left text-xs">
        <tr>
          <th className="pb-1 pl-2 font-medium">Player</th>
          <th className="pb-1 text-right font-medium">Chips</th>
          <th className="hidden pb-1 text-right font-medium min-[380px]:table-cell">
            Bought in
          </th>
          <th className="pr-2 pb-1 text-right font-medium">Result</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const mine = row.seat === mySeat
          return (
            <tr key={row.seat} className={mine ? 'bg-brass/[0.08]' : 'bg-white/[0.035]'}>
              <td className="rounded-l-2xl py-2 pl-2">
                <span className="flex items-center gap-2.5">
                  <span className="font-num text-muted w-3 text-center text-xs">
                    {i + 1}
                  </span>
                  <Avatar name={row.name} seat={row.seat} className="size-8 text-sm" />
                  <span className="min-w-0 truncate font-semibold">
                    {row.name}
                    {mine && <span className="text-muted font-normal"> (you)</span>}
                  </span>
                </span>
              </td>
              <td className="font-num py-2 text-right text-base">
                {row.stack.toLocaleString()}
              </td>
              <td className="font-num text-muted hidden py-2 text-right text-base min-[380px]:table-cell">
                {row.boughtIn.toLocaleString()}
              </td>
              <td className="rounded-r-2xl py-2 pr-2 text-right">
                <span
                  className={`font-num inline-block min-w-14 rounded-full px-2 py-0.5 text-center text-sm ${
                    row.net > 0
                      ? 'bg-up/15 text-up'
                      : row.net < 0
                        ? 'bg-down/15 text-down'
                        : 'text-muted bg-white/5'
                  }`}
                >
                  {signed(row.net)}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
