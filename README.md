# Heads-Up Poker

Play-money heads-up Texas Hold'em. React + TypeScript + Tailwind on the front end, Firebase (Auth, Firestore, Cloud Functions) on the back end, running **entirely on the local emulators** for now.

## Prerequisites

- Node.js 20+ (22 recommended)
- Java 21+ (the Firestore emulator needs it): `java -version`

## First run

```bash
npm install
npm --prefix functions install
npm --prefix functions run build
```

Then use two terminals:

```bash
# Terminal 1: Auth + Firestore + Functions emulators (UI at http://localhost:4000)
npm run emulators

# Terminal 2: the app (http://localhost:5173)
npm run dev
```

Set `TURN_SECONDS=10` before `npm run emulators` to try the turn clock with a short timer (default 30).

Open the app and click **Test emulator connection** on the home screen. If it reports "Functions emulator OK", the whole stack is wired up.

Rebuild functions after editing `functions/` or `shared/` code: `npm --prefix functions run build` (or keep `npm --prefix functions run build:watch` running).

## Scripts

| Command             | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Vite dev server                                         |
| `npm run build`     | Type-check and production build                         |
| `npm test`          | Vitest (engine unit tests + the randomized stress test) |
| `npm run lint`      | oxlint                                                  |
| `npm run format`    | Prettier (with Tailwind class sorting)                  |
| `npm run emulators` | Firebase emulators, data persisted to `emulator-data/`  |

## Structure

```
src/             React app (pages, components, store, lib)
shared/engine/   Pure TypeScript game logic: no React, no Firebase.
                 Used by the client, Cloud Functions and tests.
functions/       Cloud Functions (import shared/engine)
firestore.rules  Clients read only; hole cards readable only by their owner
firebase.json    Emulator ports and config
scripts/         smoke.mjs: plays a hand against the emulators and tries to cheat
```

## Architecture rule

Clients never write game state. A player action calls a Cloud Function, which validates it with `shared/engine`, writes to Firestore with the Admin SDK, and every client re-renders from the result.

A hand is stored in three places, written together in one transaction:

| Document                     | Holds                                                                      | Who can read it      |
| ---------------------------- | -------------------------------------------------------------------------- | -------------------- |
| `rooms/{code}/secret/hand`   | the full hand, including the deck                                          | nobody (server only) |
| `rooms/{code}/hand/current`  | the public view: pot, board, whose turn, and the result once the hand ends | signed-in players    |
| `rooms/{code}/private/{uid}` | that player's two hole cards                                               | only that player     |

## Testing

- **Unit tests** cover every engine function, written test-first.
- **Stress test** (`shared/engine/fuzz.test.ts`): plays 400 random seeded games and, after every move, checks the rules that must always hold (`shared/engine/invariants.ts`): chips conserved, 52 unique cards, the right board size, two hole cards each, and a sensible turn. A failure prints the seed so the exact game can be replayed.
- **Smoke test** (`node scripts/smoke.mjs`): with the emulators running, plays a full hand through the real functions and tries to cheat (reading the deck, reading the opponent's cards, moving out of turn, sending a malformed or illegal move).

## Status

Done: rooms and joining, the full hand engine (blinds, betting, all-ins, showdown, split pots, next hand), the server functions, the live table, the result banner, a 30-second turn clock with automatic timeout, reconnect handling (heartbeat, "away" notice, offline banner), chip stacks, and the shuffle and deal animation.

Not done yet:

1. Chips sliding into the pot at the end of a street
2. A running action log ("Alice raised to 40")
3. Full no-limit minimum-raise rule (currently: at least one big blind more)
4. Deploy to a real Firebase project, then PWA setup, and a scheduled function so a hand can't stall if both players leave
5. Trim the bundle (`pokersolver` currently ships to the browser)

The reasoning behind the design choices is in [DECISIONS.md](DECISIONS.md), and [INTERVIEW_PREP.md](INTERVIEW_PREP.md) has the questions to practise.
