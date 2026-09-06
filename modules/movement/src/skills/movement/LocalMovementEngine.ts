import { Vec3 } from 'vec3'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { LocalObstacleSolver } from './LocalObstacleSolver.js'
import { SpatialProbe } from './SpatialProbe.js'
import { TerrainAnalyzer } from './TerrainAnalyzer.js'
import type { LocomotionMode, SpatialProbeResult } from './types.js'

export interface LocalMovementTickOptions {
  allowSprint: boolean
  sprintDistance: number
  distanceToTarget: number
  maxSafeDrop: number
  localAvoidance: boolean
}

export interface LocalMovementTickResult {
  mode: LocomotionMode
  probe?: SpatialProbeResult
  avoided: boolean
  recoveryAction?: string
}

export class LocalMovementEngine {
  private readonly terrain: TerrainAnalyzer
  private readonly probe: SpatialProbe
  private readonly solver: LocalObstacleSolver

  constructor(private readonly context: SkillContext, maxSafeDrop = 3) {
    this.terrain = new TerrainAnalyzer(context.bot)
    this.probe = new SpatialProbe(context.bot, { maxSafeDrop })
    this.solver = new LocalObstacleSolver(context.bot, maxSafeDrop)
  }

  async tickToward(target: Vec3, signal: AbortSignal | undefined, options: LocalMovementTickOptions): Promise<LocalMovementTickResult> {
    const bot = this.context.bot
    const movement = this.context.movement
    const current = bot.entity.position
    const mode = this.terrain.mode()
    const verticalDelta = target.y - current.y

    await bot.lookAt(new Vec3(target.x, current.y + 1.55 + Math.max(-0.35, Math.min(0.35, verticalDelta * 0.15)), target.z), false)

    if (mode === 'swimming') {
      movement.setMany({ forward: true, sprint: false, left: false, right: false })
      if (verticalDelta > 0.45) movement.setVertical('up', 'water')
      else if (verticalDelta < -0.55) movement.setVertical('down', 'water')
      else movement.setVertical('neutral', 'water')
      return { mode, avoided: false }
    }

    if (mode === 'climbing') {
      if (verticalDelta > 0.25) movement.setVertical('up', 'climb')
      else if (verticalDelta < -0.35) movement.setVertical('down', 'climb')
      else movement.setMany({ forward: true, jump: false, sneak: false, sprint: false })
      return { mode, avoided: false }
    }

    if (mode === 'falling' || mode === 'airborne') {
      movement.set('sprint', false)
      movement.setMany({ forward: true, jump: false, sneak: false })
      return { mode, avoided: false }
    }

    const scan = this.probe.scanToward(target, 0.95, options.maxSafeDrop)

    if (scan.type === 'lava' || scan.type === 'hazard' || scan.type === 'drop') {
      if (!options.localAvoidance) {
        throw new SkillError(SkillErrorCode.UNSAFE_MOVEMENT, scan.reason ?? 'Unsafe terrain ahead', { details: { obstacle: scan } })
      }
      const decision = this.solver.decide(scan)
      await this.solver.act(decision, movement, signal)
      return { mode, probe: scan, avoided: true, recoveryAction: decision.action }
    }

    if (scan.type === 'wall' || scan.type === 'low_ceiling' || scan.type === 'door') {
      if (!options.localAvoidance) {
        throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, scan.reason ?? 'Movement corridor blocked', { details: { obstacle: scan } })
      }
      const decision = this.solver.decide(scan)
      if (decision.action === 'back' && Math.max(decision.leftScore, decision.rightScore) < 0.35) {
        throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'No safe local corridor around obstacle', {
          details: { obstacle: scan, decision }
        })
      }
      await this.solver.act(decision, movement, signal)
      return { mode, probe: scan, avoided: true, recoveryAction: decision.action }
    }

    if (scan.type === 'step') {
      movement.setMany({ forward: true, jump: true, sneak: false })
    } else if (scan.type === 'water') {
      movement.setMany({ forward: true, sprint: false, jump: verticalDelta > 0.2, sneak: verticalDelta < -0.5 })
    } else if (scan.type === 'climbable' && verticalDelta > 0.2) {
      movement.setMany({ forward: true, jump: true, sprint: false })
    } else {
      movement.setMany({ forward: true, jump: false, sneak: false })
    }

    const canSprint = options.allowSprint &&
      options.distanceToTarget >= options.sprintDistance &&
      bot.food > 6 &&
      scan.type === 'none'
    movement.set('sprint', canSprint)

    return { mode, probe: scan, avoided: false }
  }
}
