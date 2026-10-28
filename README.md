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

Open the app and click **Test emulator connection** on the home screen. If it reports "Functions emulator OK", the whole stack is wired up.

Rebuild functions after editing `functions/` or `shared/` code: `npm --prefix functions run build` (or keep `npm --prefix functions run build:watch` running).

## Scripts

| Command                | What it does                                        |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Vite dev server                                     |
| `npm run build`        | Type-check and production build                     |
| `npm test`             | Vitest (engine unit tests)                          |
| `npm run lint`         | oxlint                                              |
| `npm run format`       | Prettier (with Tailwind class sorting)              |
| `npm run emulators`    | Firebase emulators, data persisted to `emulator-data/` |

## Structure

```
src/             React app (pages, components, store, lib)
shared/engine/   Pure TypeScript game logic: no React, no Firebase.
                 Used by the client, Cloud Functions and tests.
functions/       Cloud Functions (import shared/engine)
firestore.rules  Clients read only; hole cards readable only by their owner
firebase.json    Emulator ports and config
```

## Architecture rule

Clients never write game state. A player action calls a Cloud Function, which validates it with `shared/engine`, writes to Firestore with the Admin SDK, and every client re-renders from the result. Hole cards live in `rooms/{id}/private/{uid}` and the shuffled deck in `rooms/{id}/secret/deck`, which no client can read.

## Next steps

1. Static table UI with fake data (seats, community cards, pot, action bar)
2. Anonymous auth, `createRoom` / `joinRoom`, live player list
3. Hand engine (`startHand`, `submitAction`) with Vitest tests
4. Showdown and payout using `pokersolver`
5. Event-driven animations (deal, flop stagger, chips to pot)
6. Reconnects, timeouts, mobile polish
7. PWA setup and deploy
