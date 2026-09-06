import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import type { StopParams } from './types.js'

export class StopSkill implements Skill<StopParams, { stopped: true }> {
  readonly name = 'stop'
  readonly defaultTimeoutMs = 1_500

  canRun(): boolean { return true }

  async execute(context: SkillContext, params: StopParams): Promise<{ stopped: true }> {
    if (params.cancelActive ?? true) {
      context.movementLock.cancelActive('Stopped by stop skill')
      context.movement.stopAll()
      const released = await context.movementLock.waitForFree(context.abortSignal, 1000)
      if (!released) {
        throw new SkillError(SkillErrorCode.LOCKED, 'Active movement task did not release ownership after stop request')
      }
    } else {
      context.movement.stopAll()
    }
    return { stopped: true }
  }

  verify(context: SkillContext): boolean {
    return Object.values(context.movement.snapshot()).every(value => !value)
  }

  recover(context: SkillContext): 'retry' {
    context.movement.stopAll()
    return 'retry'
  }
}
