import { setGlobalOptions } from 'firebase-functions/v2'

// A cost guard. Each function may run on at most 5 servers at once, so a bug or an abusive
// client can't make Google start hundreds of them (and bill for them). A table of friends
// never gets near this.
//
// App Check: once the site sends App Check tokens (see src/lib/appCheck.ts and the README),
// set ENFORCE_APP_CHECK=true in functions/.env and redeploy. Every callable then refuses
// requests that don't come from the real site (scripts, copies of the app). Off by default so
// a deploy before App Check is set up can't lock everyone out.
//
// This file must be imported BEFORE any function is defined (see the first line of index.ts
// and game.ts), because the options only apply to functions defined after it runs.
setGlobalOptions({
  maxInstances: 5,
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
})
