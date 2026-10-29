// Plays a whole hand against the local emulators, as two different players, and tries
// a few cheats along the way. No browser needed.
//
//   1. In one terminal:   npm run emulators
//   2. In another:        node scripts/smoke.mjs
//
// It uses the same Firebase libraries the app uses, so it behaves like two real browsers.

import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'

const HOST = '127.0.0.1'

/** A pretend browser: its own sign-in, its own connection to the emulators. */
function makeClient(label) {
  const app = initializeApp(
    { projectId: 'demo-poker', apiKey: 'demo-key', appId: 'demo-app' },
    label,
  )
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${HOST}:9099`, { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, HOST, 8080)
  const functions = getFunctions(app)
  connectFunctionsEmulator(functions, HOST, 5001)
  return {
    label,
    auth,
    db,
    call: async (name, data) => (await httpsCallable(functions, name)(data)).data,
    read: async (path) => (await getDoc(doc(db, path))).data(),
  }
}

/** Runs something that SHOULD fail, and reports what the server said. */
async function expectFailure(description, promise) {
  try {
    await promise
    console.log(`  !! ${description}: it WORKED, but it should have been refused`)
    process.exitCode = 1
  } catch (error) {
    console.log(`  ok ${description} -> refused (${error.code})`)
  }
}

const alice = makeClient('alice') // the host: seat 0
const bob = makeClient('bob') //   the guest: seat 1
const bySeat = [alice, bob]

await signInAnonymously(alice.auth)
await signInAnonymously(bob.auth)

console.log('Setting up a table')
const { code } = await alice.call('createRoom', { name: 'Alice' })
await bob.call('joinRoom', { code, name: 'Bob' })
console.log(`  table ${code}, two players seated`)

console.log('Only the host can start the game')
await expectFailure('Bob tries to start', bob.call('startGame', { code }))
await alice.call('startGame', { code })

const handPath = `rooms/${code}/hand/current`
console.log('\nWhat each player can see')
const aliceCards = await alice.read(`rooms/${code}/private/${alice.auth.currentUser.uid}`)
const bobCards = await bob.read(`rooms/${code}/private/${bob.auth.currentUser.uid}`)
console.log(`  Alice sees her own cards: ${aliceCards.cards.join(' ')}`)
console.log(`  Bob sees his own cards:   ${bobCards.cards.join(' ')}`)

console.log('\nCheats that must be refused')
await expectFailure('Bob reads the secret deck', bob.read(`rooms/${code}/secret/hand`))
await expectFailure(
  "Bob reads Alice's hole cards",
  bob.read(`rooms/${code}/private/${alice.auth.currentUser.uid}`),
)

const first = await alice.read(handPath)
const wrongSeat = 1 - first.toAct
await expectFailure(
  'moving out of turn',
  bySeat[wrongSeat].call('playAction', { code, action: { type: 'call' } }),
)
await expectFailure(
  'a malformed move',
  bySeat[first.toAct].call('playAction', {
    code,
    action: { type: 'raise', amount: '60' },
  }),
)
await expectFailure(
  'an illegal raise (too small)',
  bySeat[first.toAct].call('playAction', { code, action: { type: 'raise', amount: 21 } }),
)

console.log('\nPlaying the hand: both players just call or check')
for (let step = 0; step < 60; step++) {
  const view = await alice.read(handPath)
  if (view.phase === 'complete') break
  const seat = view.toAct
  const facingBet = view.bets[seat] < Math.max(...view.bets)
  const action = { type: facingBet ? 'call' : 'check' }
  console.log(
    `  ${view.phase.padEnd(7)} seat ${seat} ${action.type.padEnd(5)}  pot ${view.pot}  board ${view.community.join(' ') || '-'}`,
  )
  await bySeat[seat].call('playAction', { code, action })
}

const end = await alice.read(handPath)
console.log('\nHand over')
console.log(`  phase ${end.phase}, stacks ${end.stacks.join(' / ')}, pot ${end.pot}`)
console.log(
  `  cards shown to everyone: ${end.shown ? `seat 0 ${end.shown.seat0.join(' ')}, seat 1 ${end.shown.seat1.join(' ')}` : 'none'}`,
)
if (end.stacks[0] + end.stacks[1] !== 2000) {
  console.log('  !! chips are not conserved')
  process.exitCode = 1
}

console.log('\nNext hand')
const next = await bob.call('dealNextHand', { code })
console.log(`  ${JSON.stringify(next)}`)
const second = await alice.read(handPath)
console.log(
  `  hand ${second.handNumber}, button now on seat ${second.button}, stacks ${second.stacks.join(' / ')}, bets ${second.bets.join(' / ')}`,
)

console.log('\nPresence')
const carol = makeClient('carol') // a stranger who never joined
await signInAnonymously(carol.auth)
const beat = await alice.call('heartbeat', { code })
const aliceDoc = await alice.read(`rooms/${code}/players/${alice.auth.currentUser.uid}`)
console.log(
  `  Alice checks in: server clock ${beat.now}, lastSeen recorded ${aliceDoc.lastSeen}`,
)
if (aliceDoc.lastSeen !== beat.now) {
  console.log('  !! lastSeen was not recorded')
  process.exitCode = 1
}
await expectFailure(
  'a stranger checks in at the table',
  carol.call('heartbeat', { code }),
)

console.log('\nThe clock')
const clocked = await alice.read(handPath)
console.log(
  `  seat ${clocked.toAct} is on the clock for ${(clocked.turnDeadline - clocked.turnStartedAt) / 1000}s`,
)
await expectFailure(
  'claiming a timeout before time is up',
  alice.call('claimTimeout', { code }),
)

if (clocked.turnDeadline - clocked.turnStartedAt <= 10_000) {
  const wait = clocked.turnDeadline - Date.now() + 300
  console.log(`  waiting ${Math.ceil(wait / 1000)}s for the clock to run out...`)
  await new Promise((resolve) => setTimeout(resolve, Math.max(wait, 0)))
  // The player on the clock does nothing. The OTHER player asks the server to act.
  const other = bySeat[1 - clocked.toAct]
  await other.call('claimTimeout', { code })
  const after = await alice.read(handPath)
  const moved =
    after.phase === 'complete' ||
    after.toAct !== clocked.toAct ||
    after.phase !== clocked.phase
  console.log(
    `  after the timeout: phase ${after.phase}, seat ${after.toAct ?? 'nobody'} to act, stacks ${after.stacks.join(' / ')}`,
  )
  if (!moved) {
    console.log('  !! the timeout did not move the hand along')
    process.exitCode = 1
  }
  if (
    after.stacks[0] + after.stacks[1] + after.bets[0] + after.bets[1] + after.pot !==
    2000
  ) {
    console.log('  !! chips are not conserved after the timeout')
    process.exitCode = 1
  }
} else {
  console.log(
    '  (skipped the real timeout: restart the emulators with  TURN_SECONDS=3 npm run emulators  to test it)',
  )
}

console.log(process.exitCode ? '\nSomething went wrong (see !! above)' : '\nAll good')
process.exit()
