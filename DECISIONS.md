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
