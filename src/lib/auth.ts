import { signInAnonymously, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

let pending: Promise<User> | null = null

/**
 * Makes sure someone is signed in, and returns them. Players never make an account:
 * Firebase gives each browser an anonymous identity (a uid) that it remembers, so a
 * refresh keeps the same player. Several callers at once share one sign-in.
 */
export function ensureSignedIn(): Promise<User> {
  pending ??= (async () => {
    // Wait for Firebase to finish restoring a saved sign-in before deciding we need a new one.
    await auth.authStateReady()
    if (auth.currentUser) return auth.currentUser
    const credential = await signInAnonymously(auth)
    return credential.user
  })().finally(() => {
    pending = null
  })
  return pending
}
