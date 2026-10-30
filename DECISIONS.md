# Decision Log

Short notes on the choices I made while building this project and why.
Each entry: what I did, why, what else I considered, and what it costs.

## Template

### Title of the decision

- **What:**
- **Why:**
- **Alternative I rejected:**
- **Trade-off:**

---

## 1. Vite instead of Next.js

- **What:** The front end is a Vite + React single-page app. There are no server-rendered pages.
- **Why:** This is a game you reach with a table code, not content a search engine needs to find, so SEO doesn't matter. The server-side work happens in Cloud Functions, so I don't need Next.js's server features either. Vite starts instantly and builds to plain static files, which are easy to host and easy to wrap later as an installable app (PWA) or a native shell for the app stores.
- **Alternative I rejected:** Next.js. It adds more moving parts (server and client components, a second server to run) for features this app wouldn't use.
- **Trade-off:** No server rendering, so the first load shows a blank page until the JavaScript arrives. Vite also comes with no routing or data-fetching conventions, so I chose React Router and the Firebase SDK myself.

## 2. Zustand instead of Redux

- **What:** A small Zustand store holds UI-only state, such as the raise slider's `pendingBet`.
- **Why:** The real game state lives in Firestore and is changed only by Cloud Functions. The browser just displays it (via `onSnapshot`), so very little is left for the client to hold. Redux's actions and reducers would be ceremony for that. A Zustand store is a few lines.
- **Alternative I rejected:** Redux Toolkit, and React context. Redux is more structure than this needs, and context re-renders everything that reads it.
- **Trade-off:** Less built-in structure than Redux. If client state grows I'd have to organize it myself. A single global store also means values like the raise amount carry over between tables unless I reset them (see #13).

## 3. TypeScript instead of plain JavaScript

- **What:** The whole project is TypeScript: the app, the Cloud Functions and the engine. Types like `Phase`, `Action` and `Seat = 0 | 1` describe the game.
- **Why:** Poker has a lot of states and TypeScript lets me make the impossible ones impossible to write. `Action` is a union, so a `raise` must carry an `amount` and a `fold` can't. `Seat` is `0 | 1`, so `1 - seat` (which is a plain number) is rejected. The browser and the server import the same types, so they can't disagree about what a hand looks like.
- **Alternative I rejected:** Plain JavaScript. It's faster to start, but mistakes would only show up at runtime, in the middle of a hand.
- **Trade-off:** More to learn and more to type. Types also disappear at runtime, so anything the browser sends still has to be checked by code (see #29).

## 4. Firebase emulators first, real project later

- **What:** Auth, Firestore and Functions all run locally on the emulators (project id `demo-poker`). There's no real Firebase project yet.
- **Why:** It's free, there's no billing account that a buggy loop could run up, and it can't touch real data. I can reset state in seconds, so iterating is fast. Security rules and Functions run the same way locally, so I can safely test cheating attempts (`scripts/smoke.mjs`).
- **Alternative I rejected:** A real Firebase project from day one. Cloud Functions need the pay-as-you-go plan, so a mistake could cost money.
- **Trade-off:** Nobody else can play yet, and the emulator isn't identical to production (quotas, App Check, deploy configuration). I'll need to test again after deploying.

## 5. Game engine in its own pure folder (shared/engine)

- **What:** `shared/engine` is plain TypeScript with no React and no Firebase imports. The browser, the Cloud Functions and Vitest all import it.
- **Why:** The same rules run in three places: the server uses them to decide, the browser uses them to show the right buttons, and tests use them to prove they're right. If the engine imported React or Firebase, tests and Functions would have to load them too, and I couldn't test it with plain inputs and outputs. Pure functions (a state goes in, a new state comes out) also make bugs repeatable, which is what made the seeded stress test possible.
- **Alternative I rejected:** Putting the logic inside React components or inside the Cloud Functions. It couldn't be shared and would be hard to test.
- **Trade-off:** The engine can't read the database or the clock. Everything it needs, like the shuffled deck, has to be passed in. I also need a small translation layer for Firestore (see #30).

## 6. Clients never write game state

- **What:** `firestore.rules` lets clients read but never write. Every change goes through a Cloud Function, which uses the Admin SDK (the Admin SDK ignores the rules).
- **Why:** If the browser could write, a cheater could open dev tools and edit the pot, their stack or their cards, or move out of turn. The function checks who is calling, whose turn it is, and whether the move is legal (using the engine), and only then writes.
- **Alternative I rejected:** Letting clients write and checking with security rules. The rules language can't express poker rules, and I'd have to write every rule twice.
- **Trade-off:** Every move is a network round trip to a function, which is a little slower (and the first call after idle can be slower still). The functions have to be deployed, and there's more server code to maintain.

## 7. Fair shuffle with a secure random number generator

- **What:** `shuffle()` swaps each card, from the last to the first, with a random card from the part of the deck that's left. This is a standard algorithm called Fisher-Yates. `secureRandomInt()` supplies the random numbers from the browser and server's secure generator, and throws away a few leftover values so no number is favored.
- **Why:** Fisher-Yates makes every possible ordering of the deck equally likely, so no pattern or seat gets an edge. The secure generator means nobody can predict the cards. The leftover values are thrown away because a plain `%` on the random number would make the lower results slightly more likely.
- **Alternative I rejected:** `Math.random()`, because it's predictable. Sorting with a random comparator, because it's biased and favors some orderings. A plain `%` on the random number, because it slightly favors some results.
- **Trade-off:** The re-roll loop adds a few lines and almost never runs twice (about a 1-in-90-million chance), so it costs nothing in practice. Passing the random function in as an argument adds one parameter, but it lets tests use a fixed seed so the shuffle is repeatable.

## 8. Build the UI against fake data first

- **What:** `fakeTable.ts` defines the `TableState` and `SeatState` types and one fake hand on the flop. The table components draw whatever they're given from that object.
- **Why:** The backend doesn't exist yet, so this lets me build and see the table without waiting for it. The types also act as an agreement about the data's shape, so when Firestore data replaces the fake object, it should fit the same components. I checked the fake hand's chips add up (940 + 900 + 120 pot + 40 bet = 2000).
- **Alternative I rejected:** Building the backend first, which means I couldn't see anything on screen for a long time. Hard-coding values inside each component, which spreads the fake data around and makes it hard to change.
- **Trade-off:** The fake data can drift from what the real backend sends, so I'll need to update the types when the data model changes and then swap in the real data.

## 9. The opponent's hole cards are left out of what the screen receives

- **What:** `holeCards` is optional on `SeatState`. Only the viewing player's own cards are ever present, and an `inHand` flag tells the UI to draw two face-down cards for the opponent.
- **Why:** The browser must never receive the opponent's cards, or anyone could read them in dev tools. The type reflects that, and the real protection is the Firestore security rule on `private/{uid}`, which only lets the owner read their cards.
- **Alternative I rejected:** Sending everyone's cards and only hiding them visually in the UI, which would be easy to bypass.
- **Trade-off:** The UI has to handle missing cards, and there's an extra `inHand` field to keep correct. The type alone isn't security, so the rules and Cloud Functions have to be right.

## 10. The pot holds finished rounds; current bets sit in front of each seat

- **What:** `pot` is only the chips from completed betting rounds, and each seat's `bet` is what that player has put in during the current round.
- **Why:** It matches how a real table looks, and it will make the chip animation natural, since bets slide into the pot when a round ends. It also makes the chips easy to check: stacks + bets + pot should always add up to the same total.
- **Alternative I rejected:** A single pot number that includes the current bets, which hides how much each player has put in right now.
- **Trade-off:** The game logic has to move the bets into the pot at the end of every round, which is one more step to get right.

## 11. Reserve space for things that come and go

- **What:** The five board slots are always drawn, with empty ones as dashed outlines, and the bet area above each seat has a fixed height even when there's no bet.
- **Why:** If a card or a bet only took up space once it appeared, everything around it would shift on every street, which looks broken and makes animations harder. Reserved space also gives the deal animation a target position to move to.
- **Alternative I rejected:** Rendering only what exists (3 cards on the flop, no bet box without a bet), which is simpler but makes the table jump.
- **Trade-off:** Empty outlines and empty boxes take screen space that might matter on small phones.

## 12. The UI reports actions; it never decides what's legal

- **What:** `ActionBar` only calls `onAction` with what the player chose (fold, check, call, raise). `betting.ts` computes the call amount and min/max raise for display only.
- **Why:** If the browser were the referee, a cheater could change the code and make an illegal move. The Cloud Function has to validate every action using the shared engine, and the UI numbers are just a convenience so players don't have to work them out.
- **Alternative I rejected:** Letting the UI enforce the rules and write the result, which is faster to build but not safe.
- **Trade-off:** The rules will exist twice, once as simplified display math and once in the engine, so they could drift apart. I'll need to move the display logic onto the engine's rules when they exist.

## 13. The raise amount lives in Zustand and is clamped on every render

- **What:** The slider value is stored in the Zustand store (`pendingBet`), and `ActionBar` clamps it between the min and max raise each time it renders.
- **Why:** It's UI-only, half-finished input that never needs to be saved on a server, which is what Zustand is for. Clamping on render means the value can never be illegal, even if the table changes underneath it (for example, the opponent bets more).
- **Alternative I rejected:** Clamping once when the slider moves, which leaves a stale value if the limits change. Also putting the value in Firestore, which is unnecessary since nobody else needs to see it.
- **Trade-off:** The clamp runs on every render, which costs nothing here. The shared store means the amount carries over between tables unless I reset it.

## 14. Mobile-first stacked table layout

- **What:** The opponent is at the top, the felt with the pot and board in the middle, me at the bottom, and the action bar below, in one column. Cards are smaller on phones and larger from the `sm` breakpoint up.
- **Why:** Friends will mostly play on their phones, and a single column fits a narrow screen without sideways scrolling. I checked it at phone and desktop widths in a real browser.
- **Alternative I rejected:** A wide oval table with seats around the edge, which looks like a poker table but doesn't fit a phone and isn't needed for two players.
- **Trade-off:** It looks less like a classic poker table, and on a very wide screen there's a lot of empty space on the sides.

## 15. Room code is the document ID, from an unambiguous alphabet

- **What:** A table's 5-character code is also its Firestore document ID (`rooms/K7MQ2`). The alphabet leaves out 0/O and 1/I/L.
- **Why:** Joining is a single lookup by code, and `create()` fails if the ID exists, so two tables can never share a code (the function just retries with a new one). The alphabet means a code read aloud or typed from a text message can't be misread.
- **Alternative I rejected:** Auto-generated IDs plus a separate "code" field, which needs a search to join and doesn't guarantee unique codes.
- **Trade-off:** Only about 28 million codes, so a collision is possible (handled by retrying). Codes are short enough to guess, which is fine for play money, and the rules still stop anyone listing tables.

## 16. Joining a table uses a transaction

- **What:** `joinRoom` reads the room and its players, checks for a free seat, and writes the new player inside one Firestore transaction.
- **Why:** "Check there's a seat, then take it" is two steps. Without a transaction, two people joining at the same moment could both see one free seat and both take it. A transaction retries if the data changed underneath it.
- **Alternative I rejected:** A plain read followed by a plain write, which is simpler but has that race.
- **Trade-off:** Transactions are a bit more code and can retry under contention. For two seats it costs nothing.

## 17. Anonymous sign-in instead of accounts

- **What:** `ensureSignedIn()` gives each browser an anonymous Firebase identity (a uid) on first use, and Firebase remembers it.
- **Why:** Friends just want to type a name and play. A uid is still needed so the server knows who is asking and the rules can keep hole cards private.
- **Alternative I rejected:** Email or Google login, which adds friction and isn't needed for a casual game.
- **Trade-off:** Clearing browser data loses the identity (you'd come back as a new player), and there's no stats history across devices.

## 18. Rules allow reading one table by code, but not listing tables

- **What:** `rooms/{code}` allows `get` for signed-in users and denies `list` and all writes.
- **Why:** Players need to open a table they know the code for, but nobody should be able to browse every table. All changes go through Cloud Functions, which bypass the rules.
- **Alternative I rejected:** A single `allow read` on rooms, which would let any signed-in user list every table.
- **Trade-off:** There's no public lobby list, which I don't need yet. If I want one later, it needs a deliberate design.

## 19. The table screen follows Firestore live

- **What:** `useRoom` subscribes with `onSnapshot` to the room and its players, and `Room` is keyed by the table code so switching tables gets fresh state.
- **Why:** When a friend joins, Firestore pushes the change and the waiting room updates itself, with no polling or refresh. Keying by code avoids resetting state inside an effect, which the linter warned about.
- **Alternative I rejected:** Polling the server every few seconds, which is slower to react and wastes requests.
- **Trade-off:** I have to clean up the subscriptions when leaving, which the effect does, and the UI has to handle loading, missing, and error states.

## 20. Heads-up seat rules, written test-first

- **What:** `seats.ts` has three small functions: `otherSeat`, `getBlindSeats` (the button posts the small blind) and `firstToAct` (the button acts first preflop, last after). I wrote the functions to make a set of tests pass.
- **Why:** The heads-up rules differ from a full table, and that's an easy place to get things wrong. Tests that state the rules first make it obvious when the code is wrong. Using the `Seat` type (0 or 1) means a bad value can't sneak in.
- **Alternative I rejected:** Copying the full-table rule (small blind to the left of the button), which gives the wrong answer for two players. Using `1 - seat`, which TypeScript rejects because the result is a plain number.
- **Trade-off:** Writing tests first costs a little time up front. The rules are only for two players, so a bigger table would need these functions rewritten.

## 21. A betting round ends only when both players have acted and the bets have settled

- **What:** `isRoundOver` is true when `actionsThisRound >= 2` and either the two bets are equal or the player with the smaller bet has no chips left (all-in for less). The counter resets to 0 on every new street.
- **Why:** Looking at the bets alone isn't enough. Preflop the small blind can call, making both bets 20, but the big blind hasn't had their turn yet, and they're allowed to raise (their "option"). The counter makes sure both players have had a turn.
- **Alternative I rejected:** Ending the round whenever the bets are equal, which would take the big blind's option away. Tracking who raised last, which is more state to keep correct.
- **Trade-off:** There's a counter that every action has to bump and every new street has to reset. If it's wrong, a hand gets stuck, which is exactly the kind of bug the stress test (#32) exists to find.

## 22. Chips nobody can match go back to their owner when a street ends

- **What:** `advanceStreet` takes the smaller of the two bets as `matched`, adds `matched * 2` to the pot, and returns anything above that to the player who bet it.
- **Why:** You can't win more than your opponent could have risked. If one player bets 1000 into a player who only has 300, only 300 is a real bet and the other 700 must go back. It also keeps the rule "stacks + bets + pot = total chips" true after every street.
- **Alternative I rejected:** Leaving the extra in the pot, which lets a short stack win chips it never risked.
- **Trade-off:** A little more arithmetic at the end of each street.

## 23. One function decides "can anybody still bet?": settleBetting

- **What:** `bettingClosed` is true when one player is all-in and the other has nothing left to call (they have matched or out-bet the all-in). `settleBetting` moves to the next street if the round is over or betting is closed, then keeps dealing until the river while betting stays closed. It runs after every action and when a hand starts.
- **Why:** The stress test found a hand where a short-stacked big blind was all-in just from posting the blind. Nobody had acted yet, so my "is the round over?" check, which only ran after an action, never fired, and the turn went to a player with no chips. Putting the check in one function and calling it in both places fixes that whole family of bugs.
- **Alternative I rejected:** Adding a special case inside `startHand` for short blinds. That would fix this one case but not the related one, where the big blind posts exactly 20 with nothing behind and the small blind calls.
- **Trade-off:** Any code that produces a new hand has to remember to call it. Tests and the stress test cover this.

## 24. One function pays out showdowns: settleShowdown

- **What:** `settleShowdown(hand)` pays the pot and returns `reveal: true` if the hand is at showdown, and returns the hand untouched otherwise. `playTurn`, the server's `startGame` and `dealNextHand`, and the stress test all use it.
- **Why:** A hand can reach showdown without anyone acting: if both players are all-in from the blinds, `startHand` runs the whole board out. Before this function, only `playTurn` paid out, so such a hand would sit at showdown forever. The `reveal` flag also tells the server whether to show both players' cards.
- **Alternative I rejected:** Having `startHand` resolve the showdown itself. That would hide whether cards should be revealed and would pull the showdown code into hand setup.
- **Trade-off:** Callers have to remember to call it.

## 25. getLegalActions is the single source of truth for what a player may do

- **What:** `getLegalActions` returns what the player to act may do: can check, call amount, min and max raise. The server uses it through `applyAction` to reject illegal moves, and `betting.ts` in the UI now delegates to it to decide which buttons to show.
- **Why:** In #12 I noted the rules would exist twice (simplified math in the UI, real rules in the engine) and might drift. Now there's one implementation. The UI can only offer a move the server will accept.
- **Alternative I rejected:** Keeping separate display math in the UI.
- **Trade-off:** The UI imports the engine, so the browser bundle includes `pokersolver` through the engine's barrel file. I've noted that as a bundle-size item to fix later.

## 26. A simplified minimum raise

- **What:** A raise must reach at least the highest bet plus one big blind, and can never exceed what the opponent can call.
- **Why:** It keeps tiny raises out and is easy to explain and test. The full rule (a raise must be at least as big as the previous raise) would be more code for a project whose point is the architecture.
- **Alternative I rejected:** The full no-limit raise rule.
- **Trade-off:** It isn't exactly how casinos play. If someone raises to 100 and the next player re-raises, the minimum increase is still just one big blind. I'd add the full rule next if I wanted strict poker.

## 27. A hand is saved in three places, in one transaction

- **What:** `saveHand` writes the full hand to `secret/hand` (no client can read it), the censored public view to `hand/current`, and each player's hole cards to `private/{uid}` (only that player can read it).
- **Why:** Firestore security rules apply to whole documents, not to individual fields. If the deck and the cards were inside the document everyone can read, anyone could see them in the browser's network tab. So secrets have to live in different documents from public data. Writing all three in one transaction means they can never disagree.
- **Alternative I rejected:** One document with everything, hiding the secret parts in the UI. Anyone could read it from the network tab.
- **Trade-off:** Three writes per move, and the engine's full hand has to be reconstructed from `secret/hand` on each move.

## 28. toPublicState lists the safe fields; it doesn't delete the secret ones

- **What:** `toPublicState` builds a brand-new object containing only the fields everyone may see. It never copies the whole hand and then removes `deck` and `holeCards`. Hole cards appear in `shown` only when the server says a showdown happened (`reveal`).
- **Why:** If I copied everything and deleted the secrets, any field I add to `HandState` later would leak to the browser by default. A list of safe fields fails safe. The tests also check that no hole card or deck card appears anywhere in the serialized output.
- **Alternative I rejected:** `{ ...hand }` followed by `delete`, which is shorter but unsafe.
- **Trade-off:** When I add a new public field I have to remember to add it to this function too (I did this for `result`).

## 29. parseAction checks everything the browser sends

- **What:** `parseAction(unknown)` returns a clean `Action` or `null`. It requires an object, a `type` that is exactly fold, check, call or raise, and for a raise a whole-number `amount` greater than 0. It builds a fresh object, so extra fields are thrown away.
- **Why:** TypeScript types disappear at runtime, so the server can't trust what arrives. A cheater can send a string for the amount, `NaN`, or extra fields. Checking it before the engine sees it keeps the engine simple.
- **Alternative I rejected:** Trusting the shape and letting the engine throw. Returning the input object, which would let junk fields through.
- **Trade-off:** One more function and its tests. The engine's own checks (turn order, legal raise range) still have to run after it.

## 30. Translate hands for Firestore at the edge (packHand / unpackHand)

- **What:** Firestore refuses arrays inside arrays, and `holeCards` is a pair of lists. `storage.ts` converts it to `{ seat0, seat1 }` when saving and back when loading.
- **Why:** The engine's shape is the natural one for the game. I didn't want a database limitation to leak into every engine function. The conversion lives in one small file with round-trip tests.
- **Alternative I rejected:** Changing the engine's data shape to suit Firestore.
- **Trade-off:** Two small functions to keep in sync with `HandState`.

## 31. pokersolver for ranking hands, imported by default

- **What:** `getWinners` uses the `pokersolver` library to rank the best five of seven cards. I import its default export (`import pokersolver from 'pokersolver'`) and pick out `Hand`.
- **Why:** Ranking hands (straights, flushes, kickers, ties) is easy to get subtly wrong, and the library is widely used. pokersolver is an older CommonJS package, and a named import works in Vitest but breaks in plain Node ESM, which is what Cloud Functions runs, so the default import works in both. It ships without types, so I wrote a small `.d.ts` for the parts I use.
- **Alternative I rejected:** Writing my own evaluator, which is a lot of code to get right and not the point of this project.
- **Trade-off:** An extra dependency that lands in the browser bundle, and my type file only covers what I use.

## 32. A seeded stress test with invariants

- **What:** `invariants.ts` has `findProblems`, which checks a hand against rules that must always be true: chips conserved, whole non-negative amounts, 52 unique cards, the right board size for the phase, exactly two hole cards each, and a sensible "whose turn" state. `fuzz.test.ts` plays 400 random games (random fold, check, call, raise and shove using `getLegalActions`) and runs the checker after every state.
- **Why:** My 134 hand-written tests all passed, and the stress test still found a real bug (#23). I'd only tested situations I thought of. The random seed makes any failure reproducible: the report prints the seed, the problem, and the last moves.
- **Alternative I rejected:** Adding more hand-written tests, which would only cover cases I already thought of. True randomness, which would make failures impossible to reproduce.
- **Trade-off:** The invariants are only as good as the rules I wrote down. The fuzz test is not a proof, just a much wider net. It takes a fraction of a second, so it's cheap to keep running.

## 33. The hand result records payouts per seat, not one amount

- **What:** When a hand ends, `HandState.result` records `{ reason, winners, payouts, handName }`. `payouts` is how many chips each seat was awarded, like `[121, 120]`. A fold or showdown fills it in, and `toPublicState` passes it to the browser so the table can show "You win 200 with Pair, A's".
- **Why:** In a tie with an odd pot, the two players receive different amounts (the odd chip goes to the player who isn't the button), so one number can't describe it. Storing what each seat received also means the banner can't disagree with the stacks, and a test checks that each stack grew by exactly its payout.
- **Alternative I rejected:** A single `amount`, or having the UI work out the winner by comparing stacks before and after.
- **Trade-off:** One more field to carry through the engine, the public state and the table. It holds no cards, so it's safe to show to everyone.

## 34. Every move runs inside a Firestore transaction

- **What:** `playAction` reads the table and the secret hand, runs `playTurn`, and saves the result, all inside `runTransaction`. The UI also freezes the buttons while a request is in flight (`useServerCall`).
- **Why:** Two requests at the same moment, like a double click or a cheater sending a duplicate, could both be applied to the same starting state. In a transaction, the second one is retried against the updated hand and gets refused with "Not your turn".
- **Alternative I rejected:** Read, then write, with no transaction, which has a race.
- **Trade-off:** Transactions can retry under contention, so the function body must have no side effects besides its writes. For two players that's never a problem.

## 35. The turn clock belongs to the server; either screen can call time

- **What:** When a turn starts, the server writes a deadline (now + 30 seconds) next to the public hand. Both screens count down to it. At zero, either screen calls `claimTimeout`; the server checks the deadline itself and plays `timeoutAction` (check if it's free, otherwise fold).
- **Why:** A phone's clock can't be trusted, and a Cloud Function can't sit and wait, so the deadline is the server's and the server is the only one who decides time is up. Each screen measures how far its clock is from the server's when an update arrives (`clockOffset`), so they all count down to the same moment. Letting the _opponent's_ screen call time too means a player who closes their tab can't stall the table.
- **Alternative I rejected:** A timer in the browser that folds you, which a cheater could just stop. A scheduled function that checks every few seconds, which costs more and needs deploying.
- **Trade-off:** If both players leave, nobody is there to call time and the hand waits until someone returns. A scheduled Cloud Function would close that gap once deployed. The 30 seconds can be changed with `TURN_SECONDS`, which also made it possible to test a real timeout in the smoke script.

## 36. Presence with a heartbeat, not a database feature

- **What:** While a table is open, each screen calls `heartbeat` every 10 seconds and the server records `lastSeen`. If the opponent's `lastSeen` is more than 25 seconds old, my screen says they seem to be away. My own browser's online/offline events drive an offline banner, and a timeout claim that was due while I was offline is retried when I'm back.
- **Why:** Firestore has no "this client disconnected" signal, and a heartbeat is a few lines I fully understand. Refreshing the page already reconnects, because the anonymous sign-in is remembered, so I get the same seat and cards back.
- **Alternative I rejected:** Firebase's Realtime Database, which has a built-in disconnect signal and scales better, but adds a second database and more setup. Only a few friends will play, so the load is tiny (about 720 writes an hour for a table).
- **Trade-off:** It's a write every 10 seconds per player, and "away" is a guess based on silence. At real scale I'd switch to Realtime Database presence.

## 37. Chips are drawn from a tested breakdown of the amount

- **What:** `chipsFor(amount)` splits any amount into the fewest chips (1000, 500, 100, 25, 10, 5, 1), biggest first. `ChipStack` draws each denomination as a column of coloured discs, and a column stops growing at 6 chips while the number beside it stays exact.
- **Why:** Keeping the maths in a pure function means I can test it exactly (every amount from 0 to 2,500 adds up) and the component stays a thin drawing layer. Capping the height keeps big stacks from pushing the layout around.
- **Alternative I rejected:** Image assets for chips, which are heavier and harder to size, and drawing one chip per unit, which would be thousands of elements.
- **Trade-off:** Taller piles are only approximate pictures of the amount, which is why the exact number is always shown too.

## 38. Cards fly out of the deck by measuring where they are going

- **What:** `FlyIn` measures where the deck is and where a card sits, then animates the card between them. The hole cards leave in the real dealing order (the player after the button first), each taking a slot of time after a shuffle. `useDealPlan` decides once per hand whether to animate: a hand that appears while the screen is open is always dealt, but the first hand a screen sees is only dealt if it's still at preflop.
- **Why:** Measuring works for any seat or board slot without hard-coding positions, on any screen size. The "first hand" rule means someone who reloads at the river just sees the table instead of a replay of the deal. The dealing order lives in a small pure function (`dealPlan`) so it can be tested.
- **Alternative I rejected:** Fixed pixel offsets, which break on different screens, and Motion's shared-layout animation, which needs more choreography to move a card from one place in the tree to another.
- **Trade-off:** It reads positions from the page (`querySelector('[data-deck]')`), so the deck element has to exist. Someone reloading in the middle of preflop will see the deal again.

## 39. Deployed to Firebase, with the emulators kept for development

- **What:** `npm run dev` still talks to the local emulators (`import.meta.env.DEV`). A production build reads the real project's web settings from `.env.production.local`, which git ignores. Every function is capped at 5 instances, a $5 budget alert emails me, and old container images are deleted after a day.
- **Why:** The emulators are free and can't touch real data, so day-to-day work stays there. The web settings aren't secrets, but keeping them out of git keeps the repo clean for anyone who clones it. The instance cap and budget alert are the guardrails, since a Google budget only warns and never stops spending.
- **What went wrong:** The first deploy hit a Google permissions delay, so four functions were created without public access. My app said "Could not reach the game server". I called every function with `curl`: a 401 with "Sign in first." meant my own code answered, while a 403 HTML page meant Google's front door refused before my code ran. I switched those four to public access in Cloud Run. That's safe, because each function still checks who is signed in.
- **Trade-off:** Two environments to keep in mind. A redeploy only re-uploads functions whose code changed, so a setting broken by a failed deploy isn't fixed by deploying again.

## 40. The browser never downloads the hand evaluator

- **What:** Client code imports values from the engine file that defines them (`@shared/engine/actions`, `/room`, `/storage`, `/types`), never from the `@shared/engine` barrel. Type-only imports can still use the barrel. The table page and Firestore are loaded lazily, so the lobby downloads about half as much (311 KB to 160 KB gzipped).
- **Why:** The barrel also re-exports `showdown.ts`, which pulls in `pokersolver`, a CommonJS package bundlers can't strip. Only the server scores hands, so shipping it to every browser was pure waste.
- **How I check:** After a build, search the bundle for a string only pokersolver contains (`grep -l "Straight Flush" dist/assets/*.js`). It caught a regression when the 8-player work imported `MAX_SEATS` from the barrel.
- **Trade-off:** You have to remember the rule. A lint rule banning value imports from the barrel would enforce it automatically.

## 41. Up to 8 players: every list is indexed by table seat

- **What:** Every per-player list in a hand (`stacks`, `bets`, `committed`, `folded`, `acted`, `holeCards`) has one entry per seat, 0 to 7. A seat that isn't in the hand (empty, busted, or someone who sat down mid-hand) has no hole cards and is marked folded. `ring.ts` holds the seating rules: the next seat clockwise, who posts the blinds, and who acts first.
- **Why:** `player.seat` stays a direct index everywhere: the server, the public state and the UI. There's no translation between "position in this hand" and "seat at the table". Heads-up needs only one special case (the button posts the small blind), and "first to act" falls out of the general rule even for two players.
- **Alternative I rejected:** Lists holding only the players in the hand, plus a map back to seats. They're shorter, but every lookup needs translating and is easy to get wrong.
- **Trade-off:** Lists carry empty entries, so code must never assume "everyone in the list is playing". `folded`, `canAct` and `isDealtIn` answer that instead.

## 42. A betting round ends when everyone has acted since the last raise

- **What:** Each seat has an `acted` flag. Any move sets your own; a raise clears everyone else's. A round is over when every player who can still bet (not folded, not all-in) has acted and matched the highest bet. Betting is closed when at most one player still has chips and owes nothing, and then the board runs out.
- **Why:** Heads-up used "two actions and equal bets", which breaks with more players as soon as someone raises after others have called. The flags also give the big blind its option: posting a blind isn't acting.
- **Trade-off:** The minimum raise is still simplified (one big blind more), and a short all-in raise re-opens the betting, where real rules sometimes don't.

## 43. Side pots are built from what each player put in

- **What:** `committed[seat]` counts everything a player put in during the whole hand. At showdown, `buildPots` walks up the different amounts the remaining players put in. Each level makes one pot, and only players who reached that level can win it. Folded players' chips stay in as dead money. A bet nobody matched is returned before the showdown. Odd chips in a split go to the winner closest to the left of the button.
- **Why:** You can only win from each opponent what you put in yourself. A single `pot` number can't tell you that. `buildPots` and `splitPot` are pure functions with hand-checked examples, and the stress test checks on every move that `committed` equals pot plus bets.
- **Trade-off:** The result banner describes the main pot winner's hand only. Side-pot winners are named, but not their hands.

## 44. New players sit down between hands; busted players sit out

- **What:** `joinRoom` works while a game is being played. The newcomer takes the lowest free seat and is dealt in from the next hand, because `dealNextHand` builds the stacks from the player documents. When a hand ends, `saveHand` only updates the chips of players who were dealt in. A player with 0 chips gets no cards, and the game ends when fewer than two players have chips. The button moves to the next player with chips.
- **Why:** Friends drift in and out of a home game, so waiting for the host to restart would be annoying. Updating only dealt-in players is what keeps a newcomer's starting chips from being wiped by a hand they weren't in. The smoke script checks exactly that.
- **Trade-off:** There's no "leave the table" yet. Someone who walks away is timed out (check or fold) every turn, which slows a full table by up to 30 seconds per orbit. Busted players stay seated until they leave the page.

## 45. The other players are placed around an oval by relative seat

- **What:** You're always drawn at the bottom. Everyone else goes to one of seven spots around the felt, clockwise from your left, in seat order. With fewer players they're spread out instead of leaving gaps. Other players get a compact seat (small cards, name, chips, an "away" or "next hand" note), and the board and deck shrink on phones.
- **Why:** Seeing the table from your own seat is how every poker app works. The layout is a pure function (`layoutSeats`) with tests, and the cards still fly from the deck because `FlyIn` measures positions instead of hard-coding them.
- **Trade-off:** Eight players on a phone is tight, and the spots are percentages tuned by eye at 390 px and 1,200 px wide.

## 46. Busted players can rebuy for the starting stack

- **What:** A player with 0 chips sees a "Rebuy for 1,000" button. The `rebuy` function checks `canRebuy` (no chips left, game started), sets their chips back to the table's starting stack, and counts their rebuys. They're dealt in from the next hand, the same way a newcomer is. If the game had ended because only one player had chips, it starts up again.
- **Why:** At a home game with friends, busting out shouldn't mean watching for the rest of the night. Rebuy only works at 0 chips, so it can't be used to top up a short stack. The rule is a pure function in the engine with tests, and the server is the one that enforces it.
- **How it fits:** The chips on a player's document only change when a hand ends (entry 44), so you can't rebuy while you're still in a hand, even if you're all-in. `dealNextHand` already builds stacks from the player documents, so nothing else had to change.
- **Trade-off:** Unlimited rebuys at no cost, which is fine for play money. A real-money game would need limits and a ledger.

## 47. The action log is written by the server from the hand before and after each move

- **What:** Every move adds short lines to `rooms/{code}/events`, such as "Alex raises to 80", "Flop: A♠ K♦ 7♥" or "Maria wins (300) with Pair, A's". The lines come from pure engine functions (`describeStart`, `describeMove`, `describeEnd`) that compare the hand before and after the move. Each screen follows only the newest 40 lines, sorted by one `seq` number (the server's clock times 100, plus the line's place in its batch). The panel shows the latest line and opens into the recent history.
- **Why:** Only the server knows both states for certain, so the log can never disagree with the game, and a client can't write a fake line because clients can't write at all. Keeping the wording in the engine means it's tested like everything else (11 tests). One combined sort field avoids needing a composite Firestore index.
- **Alternative I rejected:** Each screen working out the lines by comparing snapshots. It misses moves when two arrive close together or the tab was asleep, and every screen could tell a slightly different story.
- **Trade-off:** One extra small write per line, which is nothing at this scale. Old lines are never deleted, but only the newest 40 are downloaded.

## 48. Hand history is built from the action log, loaded only when opened

- **What:** The History panel downloads the last 500 log lines once, when it's opened, and `groupByHand` turns them into a list of hands, newest first. Each hand shows who won and opens into its full play-by-play.
- **Why:** The log already has every line, tagged with its hand number, so history needs no new data or server code. Loading once instead of listening live means it costs nothing while it's closed.
- **Trade-off:** An open history doesn't update by itself, so you reopen it to see the latest hand. Lines like "Dan sits down" stay with the hand they happened during.

## 49. The scoreboard measures chips against everything bought in

- **What:** `standings` gives each player their chips, what they've bought in for (the starting stack times one plus their rebuys), and the difference, best first. It's in a Scores panel and on the game-over screen.
- **Why:** "Who's up tonight?" is the question at the end of a home game, and rebuys make stack size alone misleading. It's a pure engine function with tests, including "with no rebuys the results add up to zero".
- **Trade-off:** Chips on the player documents only change when a hand ends, so the scoreboard reflects the last finished hand, not chips currently bet.

## 50. Emoji reactions from a fixed list, with a server-side cooldown

- **What:** Six emojis (👍 😂 😮 😬 🔥 🙏). The `react` function only accepts those, at most one per player every 1.5 seconds, and stores the latest on the player's document. A bubble pops over that seat for 4 seconds on every screen.
- **Why:** A fixed list gives the fun of chat without moderating free text, and the cooldown stops flooding. Storing it on the player document means screens see it through the player list they already follow, with no new listener. The bubble works out what to show while rendering and uses a timer only to hide it, so a reaction that's already old when someone reloads isn't replayed.
- **Trade-off:** Only the latest reaction per player is kept, and they aren't logged. Fine for a bit of table banter.

## 51. Installable as an app, without a service worker

- **What:** A web app manifest (name, colours, standalone display, 192/512 px icons plus a maskable one), an Apple touch icon and the iPhone meta tags, and a new spade icon replacing the default Vite logo.
- **Why:** On the home screen it opens full-screen like a real app, which is how friends will actually use it. I left out a service worker on purpose: the game only works online, so offline caching would add complexity and stale-version bugs for no benefit. Current Chrome doesn't require one to install.
- **Trade-off:** No offline page. If the connection drops, the app shows the offline banner like the website does.

## 52. A dark, sleek look with one standout element: the table

- **What:** A near-black room with a soft light over an emerald felt that glows from the centre, a dark rail with a thin gold line, frosted-glass panels and name plates, pill-shaped buttons (red fold, blue call, gold raise), dark card backs with a gold lattice, and Inter with tabular figures so chip counts line up. All of it is a small set of tokens and component classes in `index.css` (`glass`, `btn`, `btn-gold`, `field`, `felt`, `card-back`, `slider`), so every screen shares one look.
- **Why:** The table is what people look at, so it gets the drama and everything around it stays quiet. Shared classes mean a colour or radius changes in one place, and components just pick from them instead of each inventing its own style.
- **Trade-off:** `backdrop-filter` blur costs a little GPU on older phones. Without it the panels are still readable, just less frosted.

## 53. Stop waiting for players who leave

- **What:** A screen now says goodbye (`heartbeat` with `leaving`) the moment it's hidden or closed, and checks in every 5 seconds instead of 10. One shared rule in the engine, `isGone`, decides when the table stops waiting: 8 seconds after a goodbye, or 12 seconds of silence when no goodbye got through (closed laptop, lost signal). Once the player on the clock is gone, any other screen asks `claimTimeout` straight away, and the server checks `isGone` itself before playing their check or fold. Gone players sit out new hands ("Alex is away and sits out") and are dealt back in when they return.
- **Why:** Before this, someone who closed the tab cost the table a full 30 seconds on every one of their turns, and kept getting dealt in. The 8-second grace means glancing at a text doesn't get you folded. The rule is a pure, tested function shared by both sides, so the screens and the server always agree about who's gone.
- **Trade-off:** A goodbye from a closing tab is best effort, since the browser may not get the request out, so silence is the fallback. A desktop player who switches tabs for more than 8 seconds on their turn gets checked or folded. Realtime Database presence would be instant and exact, at the cost of a second database (see entry 36).

## 54. The smallest chip is a 5, and every amount is a multiple of it

- **What:** `CHIP_UNIT = 5` in the engine. Raises must be a multiple of 5, except going all-in, and the server refuses others. Split pots hand out the leftover in 5-chips (305 split two ways is 155 and 150). The slider and the ½ pot and Pot buttons move in 5s, and there's no 1-chip any more.
- **Why:** Dropping the 1-chip only works if no amount ever needs one. With blinds of 10/20 and 1,000-chip stacks, enforcing 5s on raises and splits keeps every bet, pot and stack a multiple of 5, so the chips can always draw the exact amount. It's an engine rule, so the server enforces it and the stress test plays by it.
- **Trade-off:** The odd chip of a split is now 5 instead of 1, a slightly bigger edge to whoever sits closest to the left of the button. If a table ever used blinds that aren't multiples of 5, CHIP_UNIT would have to change with them.

## 55. On a phone, a whole turn fits on one screen

- **What:** Upright phones get a squarer table, your seat side by side (cards next to your name plate), and a compact betting panel that sticks to the bottom of the screen above the home bar. Very short phones (the `short` variant, like an iPhone SE) get a slightly flatter table and a tighter panel. Sideways phones (the `landscape-phone` variant) switch to two columns: the table on the left, sized by the screen's height, and your seat and the controls on the right, with smaller cards. I checked it at 360×740, 375×667, 390×844, 430×932, 667×375, 844×390 and desktop: the controls are always on screen, never cover your cards, no button wraps, and nothing scrolls sideways.
- **Why:** Before, the Fold/Call/Raise buttons sat below the bottom of every phone screen, so you had to scroll down on every turn. Tailwind's width breakpoints can't tell a short screen or a sideways phone apart, so I added two custom variants based on height and orientation.
- **Trade-off:** The seat positions are percentages tuned by eye for these sizes. Very small or unusual screens may still need a scroll for the log and reactions, which sit below the controls on purpose.

## 56. The page is never cached; the build files are cached forever

- **What:** `firebase.json` sends `Cache-Control: no-cache` for everything, so the browser checks for a newer version every time it loads. Files in `/assets`, whose names include a hash of their content, get `max-age=31536000, immutable` instead.
- **Why:** After a deploy, phones and the installed app kept showing the old version for up to an hour, because Firebase Hosting lets browsers reuse files for an hour by default. `index.html` is tiny and points at the current build's files, so always checking it costs almost nothing. The asset files change name whenever their content changes, so caching them forever is safe and makes repeat visits instant.
- **Trade-off:** Each load does one quick check for `index.html`. That's negligible.

## 57. An open app checks for updates by itself

- **What:** Every build gets a new id. It's baked into the app as `__APP_VERSION__` and written to `/version.json` (a small plugin in `vite.config.ts`). The app fetches `/version.json` with `cache: 'no-store'` when it comes back on screen and every 5 minutes. If the id differs (`hasUpdate`, a pure tested function), the lobby reloads on its own, and at a table a "New version available · Refresh" pill appears instead, so nobody's hand reloads mid-decision.
- **Why:** An app installed on an iPhone is usually resumed, not restarted, so it kept running the old version long after a deploy. This way everyone plays the version I just shipped, which matters most after server changes. It's one tiny file from Hosting, with no Firestore or Functions calls, so it costs nothing that matters.
- **Alternative I rejected:** A service worker. It's the usual tool for this, but it's built for offline caching, which this online-only game doesn't need, and a badly handled service worker is itself a classic cause of stale versions.
- **Trade-off:** A reload costs a moment of loading. At a table it's up to the player when to refresh.

## 58. One card style everywhere: big index, one big suit

- **What:** Every card face shows a large rank and suit in the top-left corner and one large suit in the bottom-right, on every screen and orientation. Only the size changes with the screen. The printed-deck layout (pips, court panels) and its helper `pips.ts` were removed.
- **Why:** The printed layout looked great on big cards but turned into a jumble on small ones (sideways phones, the board on small screens). One readable style keeps the game consistent wherever you play it, and it's how poker apps draw cards: what matters at a table is reading a card in an instant.
- **Trade-off:** Less "real deck" charm on large screens, in exchange for consistency and readability.

## 59. Nut meter: an exact count of the hands that beat you

- **What:** From the flop on, a second (gold) bar shows how close your hand is to the nuts, the best possible hand on this board. The server lists every two-card hand an opponent could hold from the unseen cards (1,081 on the flop, 990 on the river), solves each one against yours, and counts how many beat you. The bar fills by the share you beat (ties count half). It's completely full only when nothing beats you, and that includes when the board itself is the best hand. It's computed with the win estimate, only when the board changes, and only at tables with "Show hand strength" on.
- **Why:** The win bar answers "will I win against these players?" The nut meter answers a different question: "how close am I to unbeatable?" Because the board has so few possible hands, an exact count is cheap (about 1,000 solves) and needs no randomness, so the tests can check exact numbers.
- **Trade-off:** Every opponent hand is counted as equally likely, without guessing what players would actually hold. On short and sideways phones, the meter's label merges into the top line so the panel stays small.

## 60. Emoji reactions removed

- **What:** The emoji reactions from #50 are gone: the picker, the bubbles over seats, the `react` function and the engine's list and cooldown.
- **Why:** Table chat (with its own server-side cleaning and cooldown) covers the same need, and the reaction row took up space at the bottom of the screen on phones.
- **Trade-off:** No one-tap emoji. Chat can still carry them.

## 61. Computers and sideways tablets get the side-by-side layout

- **What:** Screens wider than they are tall (at least 900px wide, up to 1200px tall) now use the same two-column layout as a sideways phone: table on the left, your cards, hand strength and controls on the right. The whole layout scales with the screen height (the root font size grows, so every rem grows with it) and sits centered on the page.
- **Why:** The upright phone layout stacks everything in one column. On a laptop that column was taller than the screen, so the controls covered your own cards. Reusing the sideways layout meant no new layout to maintain, just one more media query on the same variant (`landscape-phone` became a block variant with two `@media` rules) and the matching `SIDEWAYS_PHONE` query used by code.
- **Trade-off:** Scaling by root font size is a blunt tool: it scales everything evenly instead of letting the table grow more than the controls.

## 62. The result banner names the kicker when it decided the hand

- **What:** When the winner and the closest loser have the same kind of hand and the difference is in the kickers, the banner adds it: "a wins 40 with Pair, A's (J kicker)". `describeWin` in showdown.ts compares the winning five cards with the best losing hand of the same kind and finds the first card that differs.
- **Why:** With a pair of aces on the board, both players have "Pair, A's", so the plain name made it look like the wrong person won. Saying which card decided it explains the result in the same terms players use.
- **Trade-off:** Only for hands decided by a kicker (high card, pair, two pair, trips, quads). A pair beating a lower pair, or a different kind of hand, keeps the plain name. Hand names are also tidied by `handTitle`: pokersolver says "Flush, Qd High", players say "Flush, Q high", so the suit letter is dropped everywhere a name is shown (the banner and the hand-strength panel).

## 63. The nut meter fills by your step on the hand ladder, not by combos beaten

- **What:** The meter used to fill by the share of opponent two-card combos you beat (#59). Now it sorts every hand the board allows into a ladder of different strengths (combos that would tie are one step) and fills by your step: 1 − (steps ahead of you ÷ steps below the top). The panel shows only your hand name and the bar (no count of better hands: the bar says it). It's still exact and still re-run as each card comes.
- **Why:** Most combos are junk, so beating a share of them made top pair look almost full while sets and two pairs were still out there. The ladder answers the question the bar is for: how close am I to the nuts? It also moves the way players expect: a flush draw sits near half on the flop and jumps to full when the flush comes.
- **Trade-off:** Every different hand counts as one step, whether one combo makes it or fifty, so it says nothing about how likely those better hands are. That's what the win bar is for.

## 64. One bar: the nut meter, red to green, no percentages

- **What:** The win-chance bar and its "≈ X% to win" are gone. The panel shows what you have ("Pair, A's") and one bar, the nut meter. Its colour slides from red (far from the nuts) to green (the nuts), and it's full and green with a glow when you have the nuts. The server no longer runs the Monte Carlo estimate.
- **Why:** Two bars and a percentage was more than a player needs mid-hand. One bar answering "how close am I to the best hand?" is quicker to read, and the colour says it before you read anything. Dropping the simulation also saves server time on every new card.
- **Trade-off:** No sense of how many opponents are in or how likely they are to have something. The engine keeps `estimateEquity` (tested) in case it comes back.

## 65. The nut bar from the first card, on by default, and PC windows of any shape

- **What:** Before the flop the bar now comes from the Chen formula, a classic starting-hand score (high card, pairs doubled, suited and connected bonuses, gap penalties), scaled so 7-2 offsuit is empty and A-A is full and green. From the flop on it switches to the exact ladder (#63). "Show hand strength" is now on by default when creating a table. On computers, the side-by-side layout starts at 700px wide for any window wider than it is tall, and taller windows size the table by the window height so the controls never cover your seat.
- **Why:** An empty panel until the flop looked broken, and an off-by-default setting looked like a missing feature. A browser window on a PC can be any shape, not just phone or full screen.
- **Trade-off:** The Chen score is a rule of thumb, not an exact ranking of the 169 starting hands. It's close enough for a bar and needs no lookup table.

## 66. A `tiny` layout for short windows

- **What:** A new Tailwind variant, `tiny`, covers short windows that aren't sideways phones: upright and under 680px tall, or a small square-ish desktop window. It shrinks your cards to board size, makes the table wider than tall, drops the quick-bet buttons and the "Bet · 2 BB" line, and tightens the bet controls. The table's width is capped by the window height.
- **Why:** A desktop browser window can be dragged to any size, and phones lose height to toolbars. Before this, the bet controls slid over your cards and the hand-strength panel.
- **Trade-off:** The quick-bet buttons disappear at these sizes; the slider and +/− still set any amount.
