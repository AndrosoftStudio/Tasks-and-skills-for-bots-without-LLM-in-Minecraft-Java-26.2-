import type { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import { blockTraits, collisionAtPoint, TerrainAnalyzer } from './TerrainAnalyzer.js'
import type { ProbeLane, SpatialProbeResult } from './types.js'

export interface SpatialProbeOptions {
  bodyRadius?: number
  bodyHeight?: number
  maxStepHeight?: number
  maxSafeDrop?: number
  laneOffsets?: number[]
}

export class SpatialProbe {
  private readonly terrain: TerrainAnalyzer
  private readonly bodyRadius: number
  private readonly bodyHeight: number
  private readonly maxStepHeight: number
  private readonly maxSafeDrop: number
  private readonly laneOffsets: number[]

  constructor(private readonly bot: Bot, options: SpatialProbeOptions = {}) {
    this.terrain = new TerrainAnalyzer(bot)
    this.bodyRadius = options.bodyRadius ?? 0.30
    this.bodyHeight = options.bodyHeight ?? 1.80
    this.maxStepHeight = options.maxStepHeight ?? 1.25
    this.maxSafeDrop = options.maxSafeDrop ?? 3
    this.laneOffsets = options.laneOffsets ?? [-this.bodyRadius, 0, this.bodyRadius]
  }

  scanForward(distance = 0.9, maxSafeDrop = this.maxSafeDrop): SpatialProbeResult {
    return this.scanHeading(this.bot.entity.yaw, distance, maxSafeDrop)
  }

  scanToward(target: Vec3, distance = 0.9, maxSafeDrop = this.maxSafeDrop): SpatialProbeResult {
    const p = this.bot.entity.position
    const yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z))
    return this.scanHeading(yaw, distance, maxSafeDrop)
  }

  scanHeading(yaw: number, distance = 0.9, maxSafeDrop = this.maxSafeDrop): SpatialProbeResult {
    const pos = this.bot.entity.position
    const forwardX = -Math.sin(yaw)
    const forwardZ = -Math.cos(yaw)
    const rightX = -forwardZ
    const rightZ = forwardX
    const lanes = this.laneOffsets.map(lateralOffset => {
      const x = pos.x + forwardX * distance + rightX * lateralOffset
      const z = pos.z + forwardZ * distance + rightZ * lateralOffset
      return this.scanLane(x, z, lateralOffset, maxSafeDrop)
    })

    const hazards = lanes.flatMap(lane => [lane.hazard, lane.drop.hazard]).filter((value): value is string => Boolean(value))
    const allStep = lanes.every(lane => !lane.blocked || (lane.stepHeight > 0 && lane.stepHeight <= this.maxStepHeight && !lane.headBlocked))
    const anyBlocked = lanes.some(lane => lane.blocked)
    const anyHeadBlocked = lanes.some(lane => lane.headBlocked)
    const anyUnsafeDrop = lanes.some(lane => !lane.drop.safe && lane.drop.depth > this.maxSafeDrop)
    const anyLava = lanes.some(lane => lane.hazard === 'lava' || lane.drop.fluid === 'lava')
    const anyWater = lanes.some(lane => lane.water)
    const anyClimbable = lanes.some(lane => lane.climbable)
    const anyDoor = lanes.some(lane => lane.door)
    const maxStep = Math.max(0, ...lanes.map(lane => lane.stepHeight))
    const safeDropDepth = Math.max(0, ...lanes.filter(l => l.drop.safe).map(l => l.drop.depth))

    let type: SpatialProbeResult['type'] = 'none'
    let suggestedAction: SpatialProbeResult['suggestedAction'] = 'none'
    let reason: string | undefined

    if (anyLava) {
      type = 'lava'; suggestedAction = 'stop'; reason = 'Lava intersects or lies below movement corridor'
    } else if (hazards.length > 0) {
      type = 'hazard'; suggestedAction = 'stop'; reason = `Hazard in movement corridor: ${[...new Set(hazards)].join(', ')}`
    } else if (anyUnsafeDrop) {
      type = 'drop'; suggestedAction = 'stop'; reason = 'Unsafe drop intersects movement corridor'
    } else if (anyDoor && anyBlocked) {
      type = 'door'; suggestedAction = 'stop'; reason = 'Closed/solid door-like collision blocks movement corridor'
    } else if (anyBlocked && allStep && maxStep > 0) {
      type = 'step'; suggestedAction = 'jump'; reason = `Step up to ${maxStep.toFixed(2)} blocks ahead`
    } else if (anyHeadBlocked) {
      type = 'low_ceiling'; suggestedAction = 'left'; reason = 'Insufficient body/head clearance ahead'
    } else if (anyBlocked) {
      type = 'wall'; suggestedAction = 'left'; reason = 'Body-width collision corridor is blocked'
    } else if (anyClimbable) {
      type = 'climbable'; suggestedAction = 'climb'; reason = 'Climbable block intersects movement corridor'
    } else if (anyWater) {
      type = 'water'; suggestedAction = 'swim'; reason = 'Water intersects movement corridor'
    }

    const blockedPenalty = lanes.filter(l => l.blocked).length / lanes.length
    const unsafePenalty = lanes.filter(l => !l.drop.safe && l.drop.depth > this.maxSafeDrop).length / lanes.length
    const hazardPenalty = lanes.filter(l => Boolean(l.hazard || l.drop.hazard)).length / lanes.length
    const clearanceScore = Math.max(0, 1 - blockedPenalty * 0.55 - unsafePenalty * 0.8 - hazardPenalty)

    return {
      yaw,
      distance,
      lanes,
      obstacleDetected: type !== 'none' && type !== 'water' && type !== 'climbable',
      type,
      suggestedAction,
      position: new Vec3(
        Math.floor(pos.x + forwardX * distance),
        Math.floor(pos.y),
        Math.floor(pos.z + forwardZ * distance)
      ),
      reason,
      clearanceScore,
      maxStepHeight: maxStep,
      safeDropDepth
    }
  }

  private scanLane(worldX: number, worldZ: number, lateralOffset: number, maxSafeDrop: number): ProbeLane {
    const feetY = this.bot.entity.position.y
    const feetBlock = this.bot.blockAt(new Vec3(Math.floor(worldX), Math.floor(feetY), Math.floor(worldZ)))
    const headBlock = this.bot.blockAt(new Vec3(Math.floor(worldX), Math.floor(feetY + 1), Math.floor(worldZ)))
    const feetTraits = blockTraits(feetBlock)
    const headTraits = blockTraits(headBlock)

    const lowerBlocked = collisionAtPoint(feetBlock, worldX, feetY + 0.05, feetY + 0.95, worldZ)
    const upperBlocked = collisionAtPoint(headBlock, worldX, feetY + 0.95, feetY + this.bodyHeight - 0.02, worldZ)
    const obstacleTop = feetBlock?.shapes?.reduce((top, shape) => {
      const lx = worldX - feetBlock.position.x
      const lz = worldZ - feetBlock.position.z
      if (lx >= shape[0] && lx <= shape[3] && lz >= shape[2] && lz <= shape[5]) {
        return Math.max(top, feetBlock.position.y + shape[4])
      }
      return top
    }, -Infinity)
    const stepHeight = lowerBlocked && obstacleTop !== undefined && Number.isFinite(obstacleTop)
      ? Math.max(0, obstacleTop - feetY)
      : 0

    const hazard = feetTraits.lava ? 'lava' : feetTraits.hazard ?? headTraits.hazard
    const drop = this.terrain.analyzeDropAt(worldX, worldZ, feetY, 16, maxSafeDrop)

    return {
      lateralOffset,
      blocked: lowerBlocked || upperBlocked,
      stepHeight,
      headBlocked: upperBlocked,
      water: feetTraits.water || headTraits.water,
      climbable: feetTraits.climbable || headTraits.climbable,
      door: (feetTraits.doorLike && lowerBlocked) || (headTraits.doorLike && upperBlocked),
      hazard,
      drop
    }
  }
}
