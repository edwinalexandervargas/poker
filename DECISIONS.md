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

- **What:**
- **Why:** (hint: does this app need SEO or server rendering? what happens when I wrap it later for the app stores?)
- **Alternative I rejected:**
- **Trade-off:**

## 2. Zustand instead of Redux

- **What:**
- **Why:** (hint: where does the real game state live? what is left for the client to hold?)
- **Alternative I rejected:**
- **Trade-off:**

## 3. TypeScript instead of plain JavaScript

- **What:**
- **Why:** (hint: look at the `Phase` and `Action` types in shared/engine/types.ts)
- **Alternative I rejected:**
- **Trade-off:**

## 4. Firebase emulators first, real project later

- **What:**
- **Why:** (hint: cost, safety, and how fast I can iterate)
- **Alternative I rejected:**
- **Trade-off:**

## 5. Game engine in its own pure folder (shared/engine)

- **What:**
- **Why:** (hint: who imports this folder? what would break if it imported React or Firebase?)
- **Alternative I rejected:**
- **Trade-off:**

## 6. Clients never write game state

- **What:**
- **Why:** (hint: read firestore.rules, then think about what a cheating player could do otherwise)
- **Alternative I rejected:**
- **Trade-off:**

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

Why is the room code the document ID, and what does batch.create do if the code is taken?
Why does joinRoom use a transaction, and what could go wrong without one?
Why can the browser read the room but not write it, and why can’t anyone list all rooms?
What does ensureSignedIn do, and why does it wait for authStateReady() first?
How does the waiting room update by itself when a friend joins?