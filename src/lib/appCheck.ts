import { app, useEmulators } from '@/lib/firebase'

// Firebase App Check: proves each request comes from this site, not a script or a copy of the
// app. It only runs when a reCAPTCHA Enterprise site key is set (VITE_APPCHECK_SITE_KEY in
// .env.production.local, see the README). Without one, or in `npm run dev`, nothing changes.
//
// The SDK is loaded on demand, so the lobby doesn't download it when App Check is off.
// Every request waits for this first (see ensureSignedIn in auth.ts), so the very first call
// already carries a token.
const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined

export const appCheckReady: Promise<void> =
  siteKey && !useEmulators
    ? import('firebase/app-check')
        .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
          initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(siteKey),
            isTokenAutoRefreshEnabled: true,
          })
        })
        .catch(() => {
          // Couldn't load it (offline, blocked): carry on. If the server enforces App Check,
          // it will refuse the request and the player sees that error.
        })
    : Promise.resolve()
