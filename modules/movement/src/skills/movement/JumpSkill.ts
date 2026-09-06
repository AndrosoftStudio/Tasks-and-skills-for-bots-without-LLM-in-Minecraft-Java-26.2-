import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { combineSignals, sleep } from '../../utils/async.js'
import type { JumpParams } from './types.js'

export class JumpSkill implements Skill<JumpParams, { jumped: true }> {
  readonly name = 'jump'
  readonly defaultTimeoutMs = 2_500
  readonly defaultMaxAttempts = 1

  canRun(context: SkillContext): boolean {
    return context.state.ready
  }

  async execute(context: SkillContext, params: JumpParams): Promise<{ jumped: true }> {
    const feet = context.bot.blockAt(context.bot.entity.position.floored())
    const inWater = Boolean(feet?.name.includes('water'))
    if (!context.bot.entity.onGround && !inWater) {
      throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'Cannot start a controlled jump while airborne')
    }
    const duration = Math.max(60, params.duration ?? 280)
    const cooldown = Math.max(0, params.cooldown ?? 120)
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)

    try {
      context.movement.set('forward', params.forward ?? false)
      context.movement.set('sprint', Boolean(params.forward && params.sprint && context.bot.food > 6))
      context.movement.set('jump', true)
      await sleep(duration, signal)
      context.movement.set('jump', false)
      if (cooldown > 0) await sleep(cooldown, signal)
      return { jumped: true }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(context: SkillContext): boolean {
    return !context.movement.isActive('jump')
  }

  recover(_context: SkillContext, _params: JumpParams, error: SkillError): 'fail' {
    if (error.code === SkillErrorCode.CANCELLED) return 'fail'
    return 'fail'
  }

}
