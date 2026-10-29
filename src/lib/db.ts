import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { app, useEmulators } from '@/lib/firebase'

// Kept separate from firebase.ts so the Firestore SDK is only downloaded with the table
// page (see the lazy Room import in App.tsx), not on the lobby.
export const db = getFirestore(app)

if (useEmulators) {
  connectFirestoreEmulator(db, window.location.hostname || 'localhost', 8080)
}
