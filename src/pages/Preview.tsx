import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { Card, Standing } from '@shared/engine'
import { JoinPrompt } from '@/components/JoinPrompt'
import { Table } from '@/components/Table'
import { WaitingRoom } from '@/components/WaitingRoom'
import type { SeatState, TableState } from '@/lib/fakeTable'
import type { ChatLine } from '@/lib/useChat'
import type { LogLine } from '@/lib/useEvents'

// A development-only page (`npm run dev`, then /preview) that draws the table from made-up
// states, with no Firebase behind it. For checking the design at every screen size and for
// taking README screenshots. It is never part of the deployed build (see App.tsx).

const NAMES = ['You', 'Alex', 'Maya', 'Jordan', 'Sam', 'Priya', 'Leo', 'Nina']

function seats(count: number, overrides: Partial<SeatState>[] = []): SeatState[] {
  return Array.from({ length: count }, (_, seat) => ({
    seat,
    name: NAMES[seat]!,
    stack: [1840, 960, 2210, 1500, 720, 1325, 1080, 890][seat]!,
    bet: 0,
    isDealer: seat === 2,
    isToAct: false,
    inHand: true,
    dealtIn: true,
    ...overrides[seat],
  }))
}

const MY_CARDS: [Card, Card] = ['Ah', 'Kh']

const SCENES: Record<string, TableState> = {
  // Six-handed on the flop, my turn facing a bet: the main screenshot.
  flop: {
    phase: 'flop',
    handNumber: 14,
    pot: 360,
    community: ['Qh', '7h', '2c'],
    mySeat: 0,
    bigBlind: 20,
    myHand: {
      name: 'Ace high, flush draw',
      nut: { score: 0.42, ahead: 31, better: 300, total: 1081 },
    },
    seats: seats(6, [
      { holeCards: MY_CARDS, isToAct: true },
      { bet: 80 },
      { inHand: false },
      { bet: 80 },
      {},
      { inHand: false, away: true },
    ]),
  },
  // Heads-up preflop.
  preflop: {
    phase: 'preflop',
    handNumber: 3,
    pot: 0,
    community: [],
    mySeat: 0,
    bigBlind: 20,
    myHand: {
      name: 'Ace-King suited',
      nut: { score: 0.93, ahead: 1, better: 6, total: 1225 },
    },
    seats: seats(2, [
      { holeCards: MY_CARDS, isToAct: true, bet: 10, isDealer: true },
      { bet: 20, isDealer: false },
    ]),
  },
  // A full table of eight on the turn, someone else to act.
  full: {
    phase: 'turn',
    handNumber: 27,
    pot: 1240,
    community: ['9s', '8d', '2h', 'Js'],
    mySeat: 0,
    bigBlind: 20,
    myHand: {
      name: 'Straight, J high',
      nut: { score: 0.88, ahead: 2, better: 16, total: 990 },
    },
    seats: seats(8, [
      { holeCards: ['Td', '7c'], bet: 200 },
      { inHand: false },
      { bet: 200 },
      { isToAct: true },
      { inHand: false },
      {},
      { inHand: false, dealtIn: false },
      { inHand: false },
    ]),
  },
  // The hand is over: a showdown with cards turned up.
  showdown: {
    phase: 'complete',
    handNumber: 9,
    pot: 0,
    community: ['Ks', 'Kd', '7h', '4c', 'As'],
    mySeat: 0,
    bigBlind: 20,
    result: {
      reason: 'showdown',
      winners: [0],
      payouts: [880, 0, 0, 0],
      handName: "Full House, K's full of A's",
      pots: [{ amount: 880, winners: [0] }],
    },
    seats: seats(4, [
      { holeCards: ['Ah', 'Kh'] },
      { holeCards: ['Qs', 'Qd'] },
      { inHand: false },
      { inHand: false },
    ]),
  },
}

const STANDINGS: Standing[] = [
  { name: 'Maya', seat: 2, stack: 2210, boughtIn: 1000, net: 1210 },
  { name: 'You', seat: 0, stack: 1840, boughtIn: 1000, net: 840 },
  { name: 'Jordan', seat: 3, stack: 1500, boughtIn: 1000, net: 500 },
  { name: 'Alex', seat: 1, stack: 960, boughtIn: 1000, net: -40 },
  { name: 'Sam', seat: 4, stack: 720, boughtIn: 2000, net: -1280 },
]

const now = Date.now()
const CHAT: ChatLine[] = [
  { id: 'a', seat: 1, name: 'Alex', text: 'gl everyone', at: now - 300_000 },
  { id: 'b', seat: 0, name: 'You', text: 'you too!', at: now - 280_000 },
  { id: 'c', seat: 2, name: 'Maya', text: 'that river was brutal', at: now - 60_000 },
]
const LOG: LogLine[] = [
  { id: '1', seq: 1, handNumber: 14, text: 'Hand 14' },
  { id: '2', seq: 2, handNumber: 14, text: 'Jordan posts the small blind 10' },
  { id: '3', seq: 3, handNumber: 14, text: 'Sam posts the big blind 20' },
  { id: '4', seq: 4, handNumber: 14, text: 'Alex raises to 80' },
  { id: '5', seq: 5, handNumber: 14, text: 'Flop: Q♥ 7♥ 2♣' },
]

export default function Preview() {
  const [params] = useSearchParams()
  // A turn clock 18 seconds from running out, fixed when the page opens.
  const [deadline] = useState(() => Date.now() + 18_000)
  const name = params.get('s') ?? 'flop'
  const table = SCENES[name] ?? SCENES.flop!
  const acting = table.seats.find((s) => s.isToAct)
  if (name === 'waiting') {
    return (
      <WaitingRoom
        code="K7MQ2"
        players={['You', 'Alex', 'Maya'].map((n, seat) => ({
          uid: n,
          name: n,
          seat,
          stack: 1000,
          connected: true,
        }))}
        isHost
        onStart={() => {}}
        starting={false}
        error={null}
      />
    )
  }
  if (name === 'join') return <JoinPrompt code="K7MQ2" />
  return (
    <>
      {!params.has('clean') && (
        <nav className="fixed right-2 bottom-2 z-[70] flex gap-1 text-xs opacity-60 hover:opacity-100">
          {Object.keys(SCENES).map((key) => (
            <Link key={key} to={`?s=${key}`} className="chip">
              {key}
            </Link>
          ))}
        </nav>
      )}
      <Table
        key={name}
        table={table}
        code="K7MQ2"
        onAction={() => {}}
        onNextHand={() => {}}
        turn={
          acting && table.phase !== 'complete'
            ? { deadline, totalMs: 30_000, clockOffset: 0 }
            : null
        }
        log={LOG}
        chat={CHAT}
        onChat={async () => {}}
        standings={STANDINGS}
      />
    </>
  )
}
