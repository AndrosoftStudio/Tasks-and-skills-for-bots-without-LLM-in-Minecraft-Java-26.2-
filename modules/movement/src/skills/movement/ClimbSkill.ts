import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { combineSignals, sleep, throwIfAborted } from '../../utils/async.js'
import { TerrainAnalyzer } from './TerrainAnalyzer.js'
import type { ClimbData, ClimbParams } from './types.js'

export class ClimbSkill implements Skill<ClimbParams, ClimbData> {
  readonly name = 'climb'
  readonly defaultTimeoutMs = 8_000
  readonly defaultMaxAttempts = 2

  canRun(context: SkillContext): boolean { return context.state.ready }

  async execute(context: SkillContext, params: ClimbParams): Promise<ClimbData> {
    if (!Number.isFinite(params.targetY)) throw new SkillError(SkillErrorCode.INVALID_TARGET, 'climb targetY must be finite')
    const terrain = new TerrainAnalyzer(context.bot)
    if (!terrain.nearbyClimbable()) throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'No ladder/vine/scaffolding-like surface near the bot')

    const startY = context.bot.entity.position.y
    const tolerance = Math.max(0.15, params.tolerance ?? 0.35)
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    try {
      let lastProgressAt = Date.now()
      let lastY = startY
      while (Math.abs(context.bot.entity.position.y - params.targetY) > tolerance) {
        throwIfAborted(signal)
        if (!terrain.nearbyClimbable(0.7) && Math.abs(context.bot.entity.position.y - params.targetY) > 0.8) {
          throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'Lost contact with climbable surface before reaching target Y')
        }
        const y = context.bot.entity.position.y
        const direction = params.targetY > y ? 'up' : 'down'
        context.movement.setVertical(direction, 'climb')
        if (Math.abs(y - lastY) > 0.08) { lastY = y; lastProgressAt = Date.now() }
        if (Date.now() - lastProgressAt > 1500) throw new SkillError(SkillErrorCode.STUCK, `No vertical progress while climbing ${direction}`)
        await sleep(60, signal)
      }
      context.movement.setVertical('neutral', 'climb')
      return { startY, finalY: context.bot.entity.position.y, targetY: params.targetY }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(_context: SkillContext, params: ClimbParams, data: ClimbData): boolean {
    return Math.abs(data.finalY - params.targetY) <= Math.max(0.15, params.tolerance ?? 0.35)
  }

  recover(): 'retry' { return 'retry' }
}
