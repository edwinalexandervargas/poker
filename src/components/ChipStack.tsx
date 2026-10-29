import { motion, useReducedMotion } from 'motion/react'
import { chipsFor, visibleCount } from '@/lib/chips'

// Casino-style colours for each denomination: `face` is the chip, `edge` its shadow.
const CHIP_COLOR: Record<number, { face: string; edge: string }> = {
  1: { face: '#f1f5f9', edge: '#94a3b8' },
  5: { face: '#dc2626', edge: '#7f1d1d' },
  10: { face: '#2563eb', edge: '#1e3a8a' },
  25: { face: '#16a34a', edge: '#14532d' },
  100: { face: '#1f2937', edge: '#030712' },
  500: { face: '#7c3aed', edge: '#4c1d95' },
  1000: { face: '#f5c542', edge: '#a16207' },
}

const SIZES = {
  // width of a chip, height of its face, and how far each chip sits above the one below it
  md: { width: 34, face: 14, step: 6 },
  sm: { width: 22, face: 10, step: 4 },
} as const

interface ChipStackProps {
  amount: number
  size?: keyof typeof SIZES
}

/**
 * An amount of chips drawn as columns of coloured discs, one column per denomination.
 * New chips drop in; the exact amount is always given to screen readers.
 */
export function ChipStack({ amount, size = 'md' }: ChipStackProps) {
  const reduceMotion = useReducedMotion()
  const { width, face, step } = SIZES[size]

  return (
    <div
      role="img"
      aria-label={`${amount.toLocaleString()} chips`}
      className="flex items-end gap-1"
    >
      {chipsFor(amount).map(({ value, count }) => {
        const shown = visibleCount(count)
        const color = CHIP_COLOR[value]!
        return (
          <div
            key={value}
            className="relative"
            style={{ width, height: (shown - 1) * step + face }}
          >
            {Array.from({ length: shown }, (_, i) => (
              <motion.span
                key={i}
                className="absolute left-0 rounded-full"
                style={{
                  width,
                  height: face,
                  bottom: i * step,
                  backgroundColor: color.face,
                  border: '2px dashed rgb(255 255 255 / 0.75)',
                  boxShadow: `0 2px 0 ${color.edge}`,
                }}
                initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
