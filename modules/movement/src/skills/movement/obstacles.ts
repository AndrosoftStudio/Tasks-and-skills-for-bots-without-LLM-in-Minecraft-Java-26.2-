import type { Bot } from 'mineflayer'
import { SpatialProbe } from './SpatialProbe.js'
import type { ObstacleInfo } from './types.js'

/** Backward-compatible wrapper around the V2 body-width spatial probe. */
export function scanObstacle(bot: Bot, probeDistance = 0.95, maxSafeDrop = 3): ObstacleInfo {
  return new SpatialProbe(bot, { maxSafeDrop }).scanForward(probeDistance, maxSafeDrop)
}
