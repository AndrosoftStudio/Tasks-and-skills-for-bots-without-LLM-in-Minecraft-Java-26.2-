import type { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import type { DropAnalysis, LocomotionMode } from './types.js'

type Block = ReturnType<Bot['blockAt']>

const CLIMBABLE = [
  'ladder', 'vine', 'scaffolding', 'weeping_vines', 'twisting_vines', 'cave_vines'
]
const HAZARDS = [
  'lava', 'fire', 'soul_fire', 'cactus', 'campfire', 'magma_block',
  'sweet_berry_bush', 'powder_snow', 'wither_rose'
]
const DOOR_LIKE = ['_door', '_trapdoor', '_fence_gate']

export interface BlockTraits {
  name: string
  passable: boolean
  water: boolean
  lava: boolean
  climbable: boolean
  doorLike: boolean
  hazard?: string
  collisionTop: number
  hasCollision: boolean
}

export function blockTraits(block: Block): BlockTraits {
  if (!block) {
    return {
      name: 'unloaded', passable: false, water: false, lava: false, climbable: false,
      doorLike: false, hazard: 'unloaded', collisionTop: 1, hasCollision: true
    }
  }
  const name = block.name
  const water = name.includes('water') || Boolean(block.isWaterlogged)
  const lava = name.includes('lava')
  const climbable = CLIMBABLE.some(part => name.includes(part))
  const doorLike = DOOR_LIKE.some(part => name.includes(part))
  const hazard = HAZARDS.find(part => name.includes(part))
  const shapes = block.shapes ?? []
  const collisionTop = shapes.reduce((max, shape) => Math.max(max, shape[4]), 0)
  const hasCollision = shapes.length > 0
  return {
    name,
    passable: !hasCollision || water || lava || climbable,
    water,
    lava,
    climbable,
    doorLike,
    hazard,
    collisionTop,
    hasCollision
  }
}

export function collisionAtPoint(block: Block, worldX: number, minWorldY: number, maxWorldY: number, worldZ: number): boolean {
  if (!block) return true
  if (!block.shapes || block.shapes.length === 0) return false
  const bx = block.position.x
  const by = block.position.y
  const bz = block.position.z
  const localX = worldX - bx
  const localZ = worldZ - bz
  const minLocalY = minWorldY - by
  const maxLocalY = maxWorldY - by
  return block.shapes.some(shape =>
    localX >= shape[0] && localX <= shape[3] &&
    localZ >= shape[2] && localZ <= shape[5] &&
    maxLocalY > shape[1] && minLocalY < shape[4]
  )
}

function topSurfaceAtPoint(block: Block, worldX: number, worldZ: number): number | undefined {
  if (!block?.shapes?.length) return undefined
  const localX = worldX - block.position.x
  const localZ = worldZ - block.position.z
  let top: number | undefined
  for (const shape of block.shapes) {
    if (localX >= shape[0] && localX <= shape[3] && localZ >= shape[2] && localZ <= shape[5]) {
      top = Math.max(top ?? -Infinity, block.position.y + shape[4])
    }
  }
  return top
}

export class TerrainAnalyzer {
  constructor(private readonly bot: Bot) {}

  mode(): LocomotionMode {
    const pos = this.bot.entity.position
    const feet = blockTraits(this.bot.blockAt(pos.floored()))
    const torso = blockTraits(this.bot.blockAt(pos.offset(0, 0.9, 0).floored()))
    if (feet.water || torso.water) return 'swimming'
    if (feet.climbable || torso.climbable) return 'climbing'
    if (this.bot.entity.onGround) return 'ground'
    if (this.bot.entity.velocity.y < -0.08) return 'falling'
    return 'airborne'
  }

  nearbyClimbable(radius = 0.55): boolean {
    const p = this.bot.entity.position
    const offsets = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]] as const
    return offsets.some(([dx, dz]) => {
      const feet = blockTraits(this.bot.blockAt(p.offset(dx, 0, dz).floored()))
      const torso = blockTraits(this.bot.blockAt(p.offset(dx, 1, dz).floored()))
      return feet.climbable || torso.climbable
    })
  }

  isInWater(): boolean {
    const p = this.bot.entity.position
    return blockTraits(this.bot.blockAt(p.floored())).water || blockTraits(this.bot.blockAt(p.offset(0, 1, 0).floored())).water
  }

  analyzeDropAt(worldX: number, worldZ: number, feetY: number, maxScanDepth = 16, maxSafeDrop = 3): DropAnalysis {
    const startY = Math.floor(feetY - 0.05)
    let firstFluid: 'water' | 'lava' | undefined
    let firstHazard: string | undefined

    for (let y = startY; y >= startY - maxScanDepth; y -= 1) {
      const block = this.bot.blockAt(new Vec3(Math.floor(worldX), y, Math.floor(worldZ)))
      const traits = blockTraits(block)
      if (!block) {
        return { depth: maxScanDepth + 1, safe: false, reason: 'Chunk/block data unavailable below probe' }
      }
      if (!firstFluid && traits.water) firstFluid = 'water'
      if (!firstFluid && traits.lava) firstFluid = 'lava'
      if (!firstHazard && traits.hazard) firstHazard = traits.hazard

      const top = topSurfaceAtPoint(block, worldX, worldZ)
      if (top !== undefined && top <= feetY + 0.05) {
        const depth = Math.max(0, feetY - top)
        const safeWaterLanding = firstFluid === 'water' && !firstHazard
        const safe = safeWaterLanding || (depth <= maxSafeDrop && !firstHazard && firstFluid !== 'lava')
        return {
          depth,
          landingY: top,
          landingBlock: block.name,
          fluid: firstFluid,
          hazard: firstHazard,
          safe,
          reason: safe
            ? (safeWaterLanding ? 'Water landing available' : `Drop ${depth.toFixed(2)} blocks is within configured limit`)
            : `Drop ${depth.toFixed(2)} blocks or landing hazard exceeds configured safety`
        }
      }
    }

    return {
      depth: maxScanDepth + 1,
      fluid: firstFluid,
      hazard: firstHazard,
      safe: false,
      reason: `No landing surface found within ${maxScanDepth} blocks`
    }
  }
}
