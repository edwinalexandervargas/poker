import type { Standing } from '@shared/engine'

interface ScoreboardProps {
  rows: Standing[]
  mySeat: number
}

const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString())

/** Who's up and who's down tonight, counting rebuys. Numbers update when each hand ends. */
export function Scoreboard({ rows, mySeat }: ScoreboardProps) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-white/50">
        <tr>
          <th className="pb-2 font-normal">Player</th>
          <th className="pb-2 text-right font-normal">Chips</th>
          <th className="pb-2 text-right font-normal">Bought in</th>
          <th className="pb-2 text-right font-normal">Result</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.seat} className="border-t border-white/10">
            <td className="py-2 font-semibold">
              {row.name}
              {row.seat === mySeat && (
                <span className="font-normal text-white/50"> (you)</span>
              )}
            </td>
            <td className="py-2 text-right">{row.stack.toLocaleString()}</td>
            <td className="py-2 text-right text-white/60">
              {row.boughtIn.toLocaleString()}
            </td>
            <td
              className={`py-2 text-right font-bold ${
                row.net > 0
                  ? 'text-emerald-300'
                  : row.net < 0
                    ? 'text-red-300'
                    : 'text-white/60'
              }`}
            >
              {signed(row.net)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
