// pokersolver ships without types. Minimal surface we need for showdown evaluation.
declare module 'pokersolver' {
  export class Hand {
    name: string
    descr: string
    rank: number
    cards: { value: string; suit: string }[]
    static solve(cards: string[], game?: string, canDisqualify?: boolean): Hand
    static winners(hands: Hand[]): Hand[]
    compare(other: Hand): number
  }
  const pokersolver: { Hand: typeof Hand }
  export default pokersolver
}
