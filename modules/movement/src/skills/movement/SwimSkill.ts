import { Vec3 } from 'vec3'
import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { combineSignals, sleep, throwIfAborted } from '../../utils/async.js'
import { distance3D } from '../../utils/math.js'
import { TerrainAnalyzer } from './TerrainAnalyzer.js'
import type { SwimData, SwimParams } from './types.js'

export class SwimSkill implements Skill<SwimParams, SwimData> {
  readonly name = 'swim'
  readonly defaultTimeoutMs = 8_000
  readonly defaultMaxAttempts = 2

  canRun(context: SkillContext): boolean { return context.state.ready }

  async execute(context: SkillContext, params: SwimParams): Promise<SwimData> {
    const terrain = new TerrainAnalyzer(context.bot)
    if (!terrain.isInWater()) throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'swim requires the bot to be in water')
    const hasTarget = [params.x, params.y, params.z].every(value => value !== undefined)
    const target = hasTarget ? new Vec3(params.x!, params.y!, params.z!) : undefined
    if (target && ![target.x, target.y, target.z].every(Number.isFinite)) throw new SkillError(SkillErrorCode.INVALID_TARGET, 'swim target coordinates must be finite')
    const tolerance = Math.max(0.3, params.tolerance ?? 0.8)
    const duration = Math.max(100, params.duration ?? 1000)
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    const started = Date.now()
    try {
      while (true) {
        throwIfAborted(signal)
        const p = context.bot.entity.position
        if (target && distance3D(p, target) <= tolerance) break
        if (!target && Date.now() - started >= duration) break
        if (!terrain.isInWater() && target && Math.abs(p.y - target.y) > tolerance) {
          throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'Left water before reaching swim target')
        }
        if (target) {
          await context.bot.lookAt(target.offset(0, 0.4, 0), false)
          context.movement.set('forward', true)
          if (target.y - p.y > 0.35) context.movement.setVertical('up', 'water')
          else if (target.y - p.y < -0.45) context.movement.setVertical('down', 'water')
          else context.movement.setVertical('neutral', 'water')
        } else {
          context.movement.setMany({ forward: true, sprint: false, jump: true })
        }
        await sleep(60, signal)
      }
      return { finalPosition: context.bot.entity.position.clone(), target }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(_context: SkillContext, params: SwimParams, data: SwimData): boolean {
    if (!data.target) return true
    return distance3D(data.finalPosition, data.target) <= Math.max(0.3, params.tolerance ?? 0.8)
  }

  recover(): 'retry' { return 'retry' }
}
