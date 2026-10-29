import { describe, expect, it } from 'vitest'
import { getLegalActions } from './actions.js'
import { createDeck, shuffle, type RandomInt } from './deck.js'
import type { HandState } from './hand.js'
import { startHand } from './hand.js'
import { findProblems } from './invariants.js'
import { nextHand } from './nexthand.js'
import { playTurn, settleShowdown } from './playTurn.js'
import type { Action } from './types.js'

// A stress test: play hundreds of games of 2 to 8 players with random (but legal) moves, and check that
// nothing impossible ever happens. When it fails, it prints the seed, so the exact same
// game can be replayed and debugged.

const MAX_SEATS = 8
const SMALL_BLIND = 10
const BIG_BLIND = 20
const GAMES = 600
const MAX_HANDS_PER_GAME = 60
const MAX_ACTIONS_PER_HAND = 400

/** A small repeatable random number generator (mulberry32). Same seed, same game. */
function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Picks a random move that the engine says is legal. */
function randomAction(hand: HandState, random: () => number): Action {
  const legal = getLegalActions(hand, BIG_BLIND)
  if (!legal) throw new Error('nobody to act')
  const roll = random()
  if (roll < 0.08) return { type: 'fold' }
  if (legal.canRaise && roll < 0.38) {
    // Sometimes shove everything, otherwise pick any legal amount.
    if (random() < 0.25) return { type: 'raise', amount: legal.maxRaiseTo }
    // Any legal amount, in steps of 5 (bets go up in whole 5-chips).
    const steps = Math.floor((legal.maxRaiseTo - legal.minRaiseTo) / 5)
    return {
      type: 'raise',
      amount: legal.minRaiseTo + Math.floor(random() * (steps + 1)) * 5,
    }
  }
  return legal.canCheck ? { type: 'check' } : { type: 'call' }
}

interface Failure {
  seed: number
  handNumber: number
  problems: string[]
  history: string[]
  state: HandState
}

/** Plays one whole game. Returns the first failure it finds, or null if the game was clean. */
function playGame(seed: number): Failure | null {
  const random = seeded(seed)
  const randomInt: RandomInt = (max) => Math.floor(random() * max)
  const history: string[] = []

  // 2 to 8 players scattered around an 8-seat table, with different stack sizes so that
  // all-ins for different amounts (side pots) happen all the time.
  const players = 2 + randomInt(MAX_SEATS - 1)
  const stacks = Array<number>(MAX_SEATS).fill(0)
  while (stacks.filter((chips) => chips > 0).length < players) {
    stacks[randomInt(MAX_SEATS)] = 50 + randomInt(40) * 25
  }
  const TOTAL_CHIPS = stacks.reduce((a, b) => a + b, 0)
  const button = stacks.findIndex((chips) => chips > 0)

  let hand: HandState | null = settleShowdown(
    startHand({
      handNumber: 1,
      button,
      stacks,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      deck: shuffle(createDeck(), randomInt),
    }),
  ).state

  for (let handsPlayed = 0; hand && handsPlayed < MAX_HANDS_PER_GAME; handsPlayed++) {
    const check = (state: HandState): Failure | null => {
      const problems = findProblems(state, TOTAL_CHIPS)
      return problems.length
        ? {
            seed,
            handNumber: state.handNumber,
            problems,
            history: history.slice(-12),
            state,
          }
        : null
    }

    history.push(
      `--- hand ${hand.handNumber}, button ${hand.button}, stacks ${hand.stacks.join('/')}, bets ${hand.bets.join('/')}`,
    )
    let failure = check(hand)
    if (failure) return failure

    for (let step = 0; hand.phase !== 'complete'; step++) {
      // Nobody may ever be asked to act after folding or with no chips (findProblems
      // checks that), and the result of a finished hand must add up.
      if (step >= MAX_ACTIONS_PER_HAND) {
        return {
          seed,
          handNumber: hand.handNumber,
          problems: ['hand never ended'],
          history: history.slice(-12),
          state: hand,
        }
      }
      if (hand.toAct === null) {
        return {
          seed,
          handNumber: hand.handNumber,
          problems: ['nobody to act but hand not complete'],
          history: history.slice(-12),
          state: hand,
        }
      }
      const action = randomAction(hand, random)
      history.push(
        `seat ${hand.toAct} ${action.type}${'amount' in action ? ' ' + action.amount : ''} (${hand.phase})`,
      )
      hand = playTurn(hand, hand.toAct, action, BIG_BLIND).state
      failure = check(hand)
      if (failure) return failure
    }

    const paid = hand.result?.payouts.reduce((a, b) => a + b, 0) ?? 0
    const inPots = hand.result?.pots.reduce((a, pot) => a + pot.amount, 0) ?? 0
    if (paid !== inPots) {
      return {
        seed,
        handNumber: hand.handNumber,
        problems: [`paid ${paid} but the pots held ${inPots}`],
        history: history.slice(-12),
        state: hand,
      }
    }

    const next = nextHand(hand, SMALL_BLIND, BIG_BLIND, shuffle(createDeck(), randomInt))
    hand = next && settleShowdown(next).state
  }
  return null
}

describe('stress test: random games', () => {
  it(`plays ${GAMES} random games without breaking any rule`, () => {
    const failures: Failure[] = []
    for (let seed = 1; seed <= GAMES; seed++) {
      const failure = playGame(seed)
      if (failure) failures.push(failure)
    }
    if (failures.length > 0) {
      const first = failures[0]!
      console.log(
        [
          `${failures.length} of ${GAMES} games broke a rule. First one: seed ${first.seed}, hand ${first.handNumber}`,
          ...first.problems.map((p) => `  problem: ${p}`),
          `  state: stacks ${first.state.stacks.join('/')}, bets ${first.state.bets.join('/')}, pot ${first.state.pot}, phase ${first.state.phase}, toAct ${first.state.toAct}`,
          '  last moves:',
          ...first.history.map((h) => `    ${h}`),
        ].join('\n'),
      )
    }
    expect(failures.length).toBe(0)
  })
})
