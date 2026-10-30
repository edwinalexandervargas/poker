# Interview prep: questions about this project

Cover the answer, say it out loud, then compare. Each answer is short on purpose: that is about how long you get in an interview. The numbers in brackets point to the entry in `DECISIONS.md` with the full reasoning.

## The 30-second pitch

> "It's a play-money Texas Hold'em app for 2 to 8 players, live on Firebase, with React and TypeScript on the front. The interesting part is that the browser never decides anything: every move goes to a Cloud Function that validates it with a pure TypeScript game engine, and a player can only ever read their own hole cards. I wrote the engine test-first, and a randomized stress test found a real bug that all my hand-written tests missed."

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

## Deploying, and going from 2 to 8 players

30. **What broke when you deployed?** The first deploy hit a Google permissions delay, so four functions were missing public access and players saw "Could not reach the game server". I curled every function: a 401 with my own "Sign in first." message meant my code was running, while a 403 HTML page meant Google refused the call before it reached my code. I fixed those four in Cloud Run. [39]
31. **Isn't "public access" a security hole?** No. It only means the request reaches my code. Every function checks the sign-in and the seat itself, and the database rules still block every client write. [39]
32. **How did you make the first load faster?** The browser was downloading the hand evaluator, which only the server uses, because of a barrel import of a CommonJS package. I imported from the exact files instead and lazy-loaded the table page and Firestore: 311 KB to 160 KB gzipped. [40]
33. **How did the engine change for 8 players?** Every per-player list is indexed by table seat 0 to 7, and a seat that isn't playing is just "no cards, folded". So `player.seat` is a direct index everywhere, and heads-up became a special case of the general rules. [41]
34. **When is a betting round over with 6 players?** When everyone who can still bet has acted since the last raise and matched the highest bet. A raise clears everyone else's "acted" flag. Heads-up I'd used "two actions", which breaks once someone raises after others called. [42]
35. **Explain side pots.** You can only win from each player what you put in yourself. If A is all-in for 100 and B and C put in 300, the main pot is 300 (anyone can win it) and the side pot is 400 (only B or C). I track what each player committed over the whole hand and build one pot per contribution level. [43]
36. **How did you test 8-player play?** The same seeded stress test, now with 2 to 8 players and random stack sizes so all-ins for different amounts happen constantly. It checks chips and cards after every move and that payouts equal the pots. A probe run covered about 2,000 hands, 500 of them with side pots. I also kept every heads-up test, with a small helper that converts the old fixtures. [41-43]
37. **What happens when someone joins mid-game?** They take a free seat and are dealt in next hand. The tricky part: when a hand ends, the server must only update the chips of players who were in it, or the newcomer's starting chips get overwritten with 0. [44]

38. **How did you add rebuys without touching the engine's betting code?** Chips between hands live on each player's document, and the next hand is always built from those. A rebuy just sets a busted player's chips back to the starting stack (the server checks they really have 0), and the next deal picks them up. [44, 46]

39. **How does the action log work?** After each move, the server compares the hand before and after and writes lines like "Alex raises to 80" to an `events` collection, and every screen follows the newest 40. The wording is a pure, tested engine function, and only the server writes, so the log can't be faked or get out of sync. [47]

40. **Why did you remove a feature you had built (emoji reactions)?** Chat already covered it, with the same server-side cooldown idea, and the reaction row cost space on phones. Deleting code is a normal part of keeping a product focused, and the decision log records why. [50, 60]
41. **Why no service worker for your PWA?** The game only works online, so offline caching would only add the risk of serving an old version. The manifest and icons are enough to install it to the home screen. [51]
42. **How does the scoreboard handle rebuys?** Each rebuy counts as another buy-in, so a player who rebought twice is measured against 3,000, not 1,000. A test checks that with no rebuys everyone's results add up to zero. [49]

43. **What happens when someone closes the tab mid-hand?** Their screen says goodbye as it's hidden, and if that request never makes it out, 12 seconds of missed check-ins tell us anyway. After an 8-second grace period, the others' screens ask the server to play their check or fold, the server re-checks with the same `isGone` rule, and they sit out new hands until they're back. [53]

44. **Why can't you raise to 63?** The smallest chip is a 5, so every amount at the table stays a multiple of 5 and can be drawn with real chips. The engine refuses other raises (except all-in), splits pots in 5s, and the slider steps in 5s. It's one constant, `CHIP_UNIT`, used everywhere. [54]

45. **How do you ship updates to an installed web app?** Each build stamps an id into the code and writes it to `version.json`. The app re-checks that file when it comes back on screen and every 5 minutes. If it changed, the lobby reloads and a table shows a Refresh pill. I also send `no-cache` for the page and cache the hashed asset files forever. No service worker needed. [56, 57]

46. **How does the nut meter work, and how is it different from the win bar?** The win bar is a Monte Carlo estimate against how many players are still in. The nut meter is exact: the server lists every two-card hand an opponent could have from the unseen cards (about 1,000), counts how many beat mine, and fills the bar by the share I beat. Nothing beats me, so it's the nuts and the bar is full. It's deterministic, so tests check exact counts like 1,081 combos on the flop. [59]

## Honest limitations (say these before they ask)

- It's deployed, but without App Check, so anyone with the web settings could call the functions (they still enforce every rule). [39]
- There's no "leave table" button. Someone who walks away is detected and sat out, but the goodbye from a closing tab is best effort. [53]
- The minimum raise is simplified: at least one big blind more, not the full "match the previous raise" rule. [26]
- If both players leave, nobody is there to call time, so a hand waits until someone returns (a scheduled function would fix this once deployed). [35]
- The result banner names side-pot winners but only describes the main pot winner's hand. [43]
