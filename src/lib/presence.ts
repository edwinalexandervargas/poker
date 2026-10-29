// The presence rules live in the shared engine, so the server uses exactly the same ones.
export {
  AWAY_AFTER_MS,
  HEARTBEAT_MS,
  isAway,
  isGone,
  LEFT_GRACE_MS,
} from '@shared/engine/presence'
