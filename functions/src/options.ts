import { setGlobalOptions } from 'firebase-functions/v2'

// A cost guard. Each function may run on at most 5 servers at once, so a bug or an abusive
// client can't make Google start hundreds of them (and bill for them). A table of friends
// never gets near this.
//
// This file must be imported BEFORE any function is defined (see the first line of index.ts
// and game.ts), because the option only applies to functions defined after it runs.
setGlobalOptions({ maxInstances: 5 })
