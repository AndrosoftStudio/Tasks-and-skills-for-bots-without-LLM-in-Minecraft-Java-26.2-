import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { combineSignals, sleep, throwIfAborted } from '../../utils/async.js'
import { SpatialProbe } from './SpatialProbe.js'
import type { StepUpData, StepUpParams } from './types.js'

export class StepUpSkill implements Skill<StepUpParams, StepUpData> {
  readonly name = 'stepUp'
  readonly defaultTimeoutMs = 2_500
  readonly defaultMaxAttempts = 2

  canRun(context: SkillContext): boolean { return context.state.ready }

  async execute(context: SkillContext, params: StepUpParams): Promise<StepUpData> {
    if (!context.bot.entity.onGround) throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'stepUp requires the bot to start on ground')
    const probe = new SpatialProbe(context.bot).scanForward(0.9)
    if (probe.type !== 'step') {
      throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, `No traversable step ahead (detected ${probe.type})`, { details: { obstacle: probe } })
    }
    const maxRise = Math.max(0.5, params.maxRise ?? 1.25)
    if (probe.maxStepHeight > maxRise) throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'Step exceeds configured rise')

    const startY = context.bot.entity.position.y
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    try {
      context.movement.setMany({ forward: params.forward ?? true, jump: true, sprint: Boolean(params.sprint && context.bot.food > 6) })
      const started = Date.now()
      while (Date.now() - started < 1100) {
        throwIfAborted(signal)
        if (context.bot.entity.position.y - startY >= Math.max(0.25, probe.maxStepHeight * 0.65)) break
        await sleep(50, signal)
      }
      context.movement.set('jump', false)
      await sleep(120, signal)
      const finalY = context.bot.entity.position.y
      if (finalY <= startY + 0.15) throw new SkillError(SkillErrorCode.STUCK, 'stepUp did not gain meaningful height')
      return { startY, finalY, rise: finalY - startY }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(_context: SkillContext, _params: StepUpParams, data: StepUpData): boolean { return data.rise > 0.15 }
  recover(): 'retry' { return 'retry' }
}
