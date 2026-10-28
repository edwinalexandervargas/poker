import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

// Emulator-only for now. The "demo-" project id tells Firebase this is a local
// project, so nothing here can touch a real Firebase backend.
const app = initializeApp({
  projectId: 'demo-poker',
  apiKey: 'demo-key',
  appId: 'demo-app',
})

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

const host = window.location.hostname || 'localhost'
connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
connectFirestoreEmulator(db, host, 8080)
connectFunctionsEmulator(functions, host, 5001)
