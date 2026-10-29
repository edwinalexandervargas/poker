# Interview prep: questions about this project

Cover the answer, say it out loud, then compare. Each answer is short on purpose: that is about how long you get in an interview. The numbers in brackets point to the entry in `DECISIONS.md` with the full reasoning.

## The 30-second pitch

> "It's a play-money heads-up Texas Hold'em app, React and TypeScript on the front, Firebase on the back. The interesting part is that the browser never decides anything: every move goes to a Cloud Function that validates it with a pure TypeScript game engine, and a player can only ever read their own hole cards. I wrote the engine test-first, and a randomized stress test found a real bug that all my hand-written tests missed."

## Architecture and security

1. **Why can't the browser write game state?** If it could, a cheater could edit the pot, their stack or their cards in dev tools, or play out of turn. Rules only allow reads. Cloud Functions check who is calling, whose turn it is, and whether the move is legal with the engine, then write with the Admin SDK. [6]
2. **Where does a hand live, and why in three places?** The full hand in `secret/hand` (nobody can read it), a censored public view in `hand/current`, and each player's hole cards in `private/{uid}` (only the owner can read them). Firestore rules work per document, not per field, so secrets need their own documents. All three are written in one transaction so they can't disagree. [27]
3. **How do you make sure the opponent's cards never reach the browser?** `toPublicState` builds a fresh object from a list of safe fields, never "copy everything and delete the secrets". Cards appear only after the server says a showdown happened. Tests check no card appears anywhere in the serialized output. [28]
4. **What does `parseAction` protect against?** Types disappear at runtime, so the server can't trust what the browser sends: a string for the amount, `NaN`, extra fields. It returns a clean `Action` or `null`, building a new object so extra fields are dropped. [29]
5. **Why does `joinRoom` use a transaction?** "Check there's a free seat, then take it" is two steps. Two people joining at once could both see one free seat and both take it. A transaction retries if the data changed underneath it. [16]
6. **Why is the room code the document ID?** Joining is a single lookup, and `create()` fails if the ID already exists, so two tables can never share a code (the function just tries a new one). The alphabet leaves out look-alike characters. [15]
7. **Why can the browser read one room but not list rooms?** Players need to open a table they have the code for, but nobody should be able to browse every table. So `get` is allowed and `list` is not. [18]
8. **What does `ensureSignedIn` do, and why wait for `authStateReady()`?** It gives each browser an anonymous Firebase identity. It waits for Firebase to finish restoring any saved session first. Otherwise it could think nobody is signed in and create a new anonymous user on every page load. [17]
9. **How does the waiting room update by itself?** `onSnapshot` subscriptions to the room and its players: Firestore pushes changes, so there's no polling. The effect cleans up the subscriptions when you leave. [19]
10. **What stops two requests being applied to the same state?** Every move runs inside a Firestore transaction. The second request is retried against the updated hand and refused with "Not your turn". The UI also freezes the buttons while a request is in flight. [34]

## The game engine

11. **Who posts the small blind heads-up, and who acts first?** The button posts the small blind and acts first before the flop, last after it. That's different from a full table, so it lives in small tested functions (`getBlindSeats`, `firstToAct`) instead of being written inline. [20]
12. **Why does `startHand` take an already-shuffled deck?** So the function is predictable: same input, same output, which makes it testable. The random shuffle happens at the edge, on the server, with a secure random number generator. [5, 7]
13. **What does `Math.min(smallBlind, stack)` protect against?** A player with fewer chips than the blind. Without it their stack would go negative and chips would appear from nowhere. They post what they have and are all-in.
14. **Why is the pot 0 right after the blinds?** The blinds are bets in the current round and sit in front of each seat. Bets move into the pot when the street ends. That also keeps one easy rule true: stacks + bets + pot is always the total chips. [10]
15. **Why is `maxRaiseTo` the smaller of the two totals?** You can't bet chips your opponent can't call. Example: I have 500 behind and no bet; they have 80 behind and a 20 bet, so their total is 100. I can raise to at most 100. [25]
16. **Why does a round need two actions, not just equal bets?** Preflop the small blind can call and make the bets equal, but the big blind hasn't had a turn yet and may want to raise. A counter makes sure both players have acted. [21]
17. **What happens when one player bets more than the other can call?** Only the matched amount goes in the pot. The rest is returned to the player who bet it. [22]
18. **Why is `getLegalActions` in the shared engine?** The server uses it to reject illegal moves, the UI uses it to decide which buttons to show, and tests use it. One implementation means the UI can only offer moves the server accepts. [25]
19. **Why store `payouts` per seat instead of one amount?** In a tie with an odd pot the players get different amounts (121 and 120), so one number can't describe it. It also lets a test prove each stack grew by exactly its payout. [33]

## Testing

20. **Tell me about a bug you found.** _"I built a randomized stress test that plays 400 games and checks invariants like chip conservation after every move. It found a hand where a short-stacked big blind was all-in from the blinds alone, so the engine handed the turn to a player with no chips. My round-ending check only ran after an action, so I added a single `settleBetting` function that checks 'can anyone still bet?' both after actions and at hand start."_ [23, 32]
21. **Why did your hand-written tests miss it?** I only tested situations I thought of. Nobody (me included) thought of "the blind itself puts someone all-in". Random play covers cases I wouldn't write down.
22. **Why is the fuzz test seeded?** A random failure you can't reproduce is useless. With a seed, the report says "seed 11, hand 8" and I can replay exactly that game. [32]
23. **Why check the invariants after every move, not just at the end?** Then the failure points at the exact move that broke the rule, and a hand that gets stuck is caught immediately instead of looking like a timeout.
24. **What are the invariants?** Chips are conserved, amounts are whole and non-negative, there are 52 unique cards, the board size matches the phase, each player has two hole cards, and someone is to act exactly when a betting round is running (and has chips). [32]

## Timer, reconnect and animation

25. **How does the turn timer work if a Cloud Function can't wait?** The server writes a deadline when a turn starts. Both screens count down to it and, at zero, call `claimTimeout`; the server checks the deadline itself and plays the automatic move (check if free, otherwise fold). Either screen can call it, so a player who closes the tab can't stall the table. [35]
26. **Why not trust the browser's clock?** A phone's clock can be minutes off, and a cheater can change it. The server's deadline is the only one that counts; each screen measures the gap between its clock and the server's when an update arrives and corrects for it. [35]
27. **How do you know the other player left?** Each open table sends a heartbeat every 10 seconds and the server records `lastSeen`. Over 25 seconds of silence shows "away". At scale I'd use Realtime Database presence instead. [36]
28. **How do you tell a new hand from someone reloading the page?** A hand that appears while the screen is open is always dealt on screen; the first hand a screen sees is only dealt if it's at preflop. [38]
29. **How do the cards fly out of the deck?** `FlyIn` measures the deck and the card's final spot and animates between them with Motion, so it works for any seat or board slot and any screen size. [38]

## Honest limitations (say these before they ask)

- It runs on the Firebase emulators only; I haven't deployed it. I'd need to retest after deploying (quotas, App Check). [4]
- The minimum raise is simplified: at least one big blind more, not the full "match the previous raise" rule. [26]
- If both players leave, nobody is there to call time, so a hand waits until someone returns (a scheduled function would fix this once deployed). [35]
- The browser bundle includes `pokersolver` because the UI imports the engine through its barrel file. [25]
