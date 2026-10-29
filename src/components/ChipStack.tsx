import { motion, useReducedMotion } from 'motion/react'
import { chipsFor, visibleCount } from '@/lib/chips'

// Casino colours for each denomination. `face` is the chip, `edge` the darker side,
// `spot` the edge inserts (white on most chips, dark on the light ones), `ink` the label.
const CHIP_COLOR: Record<
  number,
  { face: string; edge: string; spot: string; ink: string }
> = {
  1: { face: '#ebe8e0', edge: '#b9b4a8', spot: '#2a4a8a', ink: '#1f2f55' },
  5: { face: '#c8323a', edge: '#86171d', spot: '#f6f1e6', ink: '#ffffff' },
  10: { face: '#2a6fca', edge: '#16437f', spot: '#f6f1e6', ink: '#ffffff' },
  25: { face: '#1f8a52', edge: '#0f5131', spot: '#f6f1e6', ink: '#ffffff' },
  100: { face: '#1c2024', edge: '#050607', spot: '#e3be62', ink: '#f2efe6' },
  500: { face: '#6d3fd1', edge: '#3d1e86', spot: '#f6e2a6', ink: '#ffffff' },
  1000: { face: '#d9ad48', edge: '#8a6417', spot: '#1c2024', ink: '#2a1d05' },
}

const SIZES = {
  // chip width, height of the top face (an ellipse), thickness of one chip's edge,
  // and whether the top chip is big enough to print its value on
  md: { width: 36, face: 16, thick: 5, label: true },
  sm: { width: 22, face: 10, thick: 3, label: false },
} as const

/** "1K" for 1000, otherwise the number. Short enough to fit on a chip. */
function chipLabel(value: number): string {
  return value >= 1000 ? `${value / 1000}K` : String(value)
}

interface ChipStackProps {
  amount: number
  size?: keyof typeof SIZES
}

/**
 * An amount of chips drawn as columns of casino chips, one column per denomination.
 * Each chip has a striped edge (the "edge spots" of a real clay chip); the top chip shows its
 * face and value. New chips drop in; the exact amount is always given to screen readers.
 */
export function ChipStack({ amount, size = 'md' }: ChipStackProps) {
  const reduceMotion = useReducedMotion()
  const { width, face, thick, label } = SIZES[size]

  return (
    <div
      role="img"
      aria-label={`${amount.toLocaleString()} chips`}
      className="flex items-end gap-1"
    >
      {chipsFor(amount).map(({ value, count }) => {
        const shown = visibleCount(count)
        const color = CHIP_COLOR[value]!
        // Edge spots: stripes of the chip colour broken by short inserts.
        const edge = `repeating-linear-gradient(90deg, ${color.edge} 0 ${width / 8}px, ${color.spot} ${width / 8}px ${width / 8 + 3}px)`

        return (
          <div
            key={value}
            className="relative"
            title={`${count} × ${value}`}
            style={{ width, height: (shown - 1) * thick + face + thick }}
          >
            {Array.from({ length: shown }, (_, i) => {
              const isTop = i === shown - 1
              return (
                <motion.div
                  key={i}
                  className="absolute left-0"
                  style={{ width, height: face + thick, bottom: i * thick }}
                  initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  {/* The side of the chip: half an ellipse below the face, striped. */}
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-b-[50%]"
                    style={{
                      top: face / 2,
                      background: edge,
                      // a dark line under each chip so a stack reads as separate chips
                      boxShadow:
                        'inset 0 -2px 2px rgb(0 0 0 / 0.35), 0 1px 0 rgb(0 0 0 / 0.45)',
                    }}
                  />
                  {/* The top face: edge spots around the rim and a lighter inlay in the middle,
                      where the value is printed. */}
                  <div
                    className="absolute inset-x-0 top-0 flex items-center justify-center rounded-[50%]"
                    style={{
                      height: face,
                      background: `radial-gradient(ellipse at 40% 30%, rgb(255 255 255 / 0.3), transparent 55%), ${color.face}`,
                      boxShadow: `inset 0 0 0 1px ${color.edge}`,
                    }}
                  >
                    {/* Rim spots: a thick dashed ring reads as the inserts on a clay chip. */}
                    <div
                      className="absolute rounded-[50%]"
                      style={{
                        inset: 1,
                        border: `${size === 'md' ? 2.5 : 1.5}px dashed ${color.spot}`,
                        opacity: 0.9,
                      }}
                    />
                    {/* The inlay. */}
                    <div
                      className="absolute rounded-[50%]"
                      style={{
                        inset: size === 'md' ? '22% 24%' : '24% 26%',
                        background: `color-mix(in srgb, ${color.face} 70%, white)`,
                        boxShadow: `inset 0 0 0 1px ${color.edge}`,
                      }}
                    />
                    {isTop && label && (
                      <span
                        className="relative text-[7px] leading-none font-extrabold tracking-tight"
                        style={{ color: color.ink }}
                      >
                        {chipLabel(value)}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
