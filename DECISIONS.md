## 7. Fair shuffle with a secure random number generator

- **What:** (Name the two pieces in deck.ts: the shuffle algorithm and the function that picks random numbers. One sentence on what each does.)
- **Why:** (Two reasons, one for each piece. Why must every deck ordering have an equal chance? Why does `value % maxExclusive` alone make some results more likely, and what does the re-roll loop do about it?)
- **Alternative I rejected:** (What else could you have used to get random numbers? What else could you have done to pick a random card position? Why wouldn't those work?)
- **Trade-off:** (What does the re-roll loop cost? What did passing the random function in as an argument cost or buy you when testing?)


- **What:** `shuffle()` swaps each card, from the last to the first, with a random card from the part of the deck that's left. This is a standard algorithm called Fisher-Yates. `secureRandomInt()` supplies the random numbers from the browser and server's secure generator, and throws away a few leftover values so no number is favored.
- **Why:** Fisher-Yates makes every possible ordering of the deck equally likely, so no pattern or seat gets an edge. The secure generator means nobody can predict the cards. The leftover values are thrown away because a plain `%` on the random number would make the lower results slightly more likely.
- **Alternative: I rejected:** `Math.random()`, because it's predictable. Sorting with a random comparator, because it's biased and favors some orderings. A plain `%` on the random number, because it slightly favors some results.
- **Trade-off:** The re-roll loop adds a few lines and almost never runs twice (about a 1-in-90-million chance), so it costs nothing in practice. Passing the random function in as an argument adds one parameter, but it lets tests use a fixed seed so the shuffle is repeatable.