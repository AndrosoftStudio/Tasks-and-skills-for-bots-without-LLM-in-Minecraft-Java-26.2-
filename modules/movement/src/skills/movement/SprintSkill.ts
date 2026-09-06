import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import type { SprintParams } from './types.js'

export class SprintSkill implements Skill<SprintParams, { enabled: boolean }> {
  readonly name = 'sprint'
  readonly defaultTimeoutMs = 1_000

  canRun(context: SkillContext): boolean {
    return context.state.ready
  }

  async execute(context: SkillContext, params: SprintParams): Promise<{ enabled: boolean }> {
    if (context.movementLock.isLocked) {
      throw new SkillError(SkillErrorCode.LOCKED, `Movement is controlled by ${context.movementLock.owner ?? 'another skill'}`)
    }
    if (params.enabled && !context.movement.isActive('forward')) {
      throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'Sprint requires forward movement')
    }
    if (params.enabled && context.bot.food <= 6) {
      throw new SkillError(SkillErrorCode.MOVEMENT_BLOCKED, 'Hunger is too low for sprinting')
    }
    context.movement.set('sprint', params.enabled)
    return { enabled: params.enabled }
  }

  verify(context: SkillContext, params: SprintParams): boolean {
    return context.movement.isActive('sprint') === params.enabled
  }

  recover(): 'fail' { return 'fail' }
}
