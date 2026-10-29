// Plays a 3-player hand against the local emulators, then has a 4th player sit down in the
// middle of the game and checks they're dealt in from the next hand. No browser needed.
//
//   1. In one terminal:   npm run emulators
//   2. In another:        node scripts/smoke-multi.mjs

import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'

const HOST = '127.0.0.1'

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
    call: async (name, data) => (await httpsCallable(functions, name)(data)).data,
    read: async (path) => (await getDoc(doc(db, path))).data(),
  }
}

function fail(message) {
  console.log(`  !! ${message}`)
  process.exitCode = 1
}

async function expectFailure(description, promise) {
  try {
    await promise
    fail(`${description}: it WORKED, but it should have been refused`)
  } catch (error) {
    console.log(`  ok ${description} -> refused (${error.code})`)
  }
}

const sum = (list) => list.reduce((a, b) => a + b, 0)
const names = ['Alice', 'Bob', 'Cara', 'Dan']
const clients = names.map((n) => makeClient(n.toLowerCase()))
for (const c of clients) await signInAnonymously(c.auth)
const [alice, bob, cara, dan] = clients

console.log('Setting up a 3-player table')
const { code } = await alice.call('createRoom', { name: 'Alice' })
const bySeat = { 0: alice }
for (const [client, name] of [
  [bob, 'Bob'],
  [cara, 'Cara'],
]) {
  const { seat } = await client.call('joinRoom', { code, name })
  bySeat[seat] = client
}
console.log(`  table ${code}, seats: ${Object.keys(bySeat).join(', ')}`)
await alice.call('startGame', { code })

const handPath = `rooms/${code}/hand/current`
const first = await alice.read(handPath)
console.log(
  `  hand 1: button seat ${first.button}, blinds posted ${first.bets.slice(0, 3).join('/')}, seat ${first.toAct} to act`,
)
if (first.dealtIn.filter(Boolean).length !== 3) fail('expected 3 players dealt in')

console.log('\nEveryone sees only their own cards')
for (const [seat, client] of Object.entries(bySeat)) {
  const mine = await client.read(`rooms/${code}/private/${client.auth.currentUser.uid}`)
  console.log(`  seat ${seat} sees ${mine.cards.join(' ')}`)
}
await expectFailure(
  "Cara reads Bob's cards",
  cara.read(`rooms/${code}/private/${bob.auth.currentUser.uid}`),
)

console.log('\nDan sits down in the middle of the hand')
const danSeat = (await dan.call('joinRoom', { code, name: 'Dan' })).seat
bySeat[danSeat] = dan
const danCards = await dan.read(`rooms/${code}/private/${dan.auth.currentUser.uid}`)
console.log(
  `  Dan took seat ${danSeat}; cards this hand: ${danCards?.cards?.length ? danCards.cards.join(' ') : 'none (waits for the next hand)'}`,
)
await expectFailure(
  'Dan tries to act in a hand he is not in',
  dan.call('playAction', { code, action: { type: 'call' } }),
)

console.log(
  '\nPlaying the hand: the first player raises, everyone calls, then checks down',
)
let raised = false
for (let step = 0; step < 60; step++) {
  const view = await alice.read(handPath)
  if (view.phase === 'complete') break
  const seat = view.toAct
  const facing = view.bets[seat] < Math.max(...view.bets)
  const action = !raised
    ? { type: 'raise', amount: 60 }
    : { type: facing ? 'call' : 'check' }
  raised = true
  console.log(
    `  ${view.phase.padEnd(7)} seat ${seat} ${action.type.padEnd(5)}  pot ${view.pot}  board ${view.community.join(' ') || '-'}`,
  )
  await bySeat[seat].call('playAction', { code, action })
}

const end = await alice.read(handPath)
console.log('\nHand over')
console.log(
  `  ${JSON.stringify(end.result?.pots)} -> payouts ${end.result?.payouts.join('/')}`,
)
if (sum(end.stacks) !== 3000) fail(`chips not conserved: ${sum(end.stacks)}`)
const shownSeats = Object.entries(end.shown ?? {})
  .filter(([, cards]) => cards.length)
  .map(([seat]) => seat)
console.log(`  cards shown at showdown: ${shownSeats.join(', ')}`)
if (shownSeats.length !== 3) fail('expected all 3 players to show cards')

console.log('\nNext hand: Dan is dealt in')
await bob.call('dealNextHand', { code })
const second = await alice.read(handPath)
console.log(
  `  hand ${second.handNumber}: button seat ${second.button}, dealt in: ${second.dealtIn.flatMap((d, s) => (d ? [s] : [])).join(', ')}`,
)
if (!second.dealtIn[danSeat]) fail('Dan was not dealt in')
if (second.button === first.button) fail('the button did not move')
const players = await Promise.all(
  Object.values(bySeat).map((c) =>
    c.read(`rooms/${code}/players/${c.auth.currentUser.uid}`),
  ),
)
console.log(
  `  stacks on the player documents: ${players.map((p) => `${p.name} ${p.stack}`).join(', ')}`,
)
if (sum(second.stacks) + sum(second.bets) + second.pot !== 4000) {
  fail('chips not conserved after Dan joined')
}

console.log(process.exitCode ? '\nSomething went wrong (see !! above)' : '\nAll good')
process.exit()
