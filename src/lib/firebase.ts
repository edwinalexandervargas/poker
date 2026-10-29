import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

// `npm run dev` talks to the local emulators. The "demo-" project id tells Firebase this is
// a local project, so nothing in development can touch a real backend.
//
// `npm run build` (what gets deployed) uses the real project instead, with the values from
// .env.production.local (see .env.example). These are web settings, not secrets: they only
// say WHICH project to talk to. The security rules and the functions are what protect it.
export const useEmulators = import.meta.env.DEV

if (!useEmulators && !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  throw new Error(
    'Missing VITE_FIREBASE_* settings. Copy .env.example to .env.production.local.',
  )
}

export const app = initializeApp(
  useEmulators
    ? { projectId: 'demo-poker', apiKey: 'demo-key', appId: 'demo-app' }
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      },
)

export const auth = getAuth(app)
export const functions = getFunctions(app)

// Firestore lives in ./db.ts: it is the biggest part of the Firebase SDK and only the
// table page needs it, so the lobby loads without it.

if (useEmulators) {
  const host = window.location.hostname || 'localhost'
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFunctionsEmulator(functions, host, 5001)
}
