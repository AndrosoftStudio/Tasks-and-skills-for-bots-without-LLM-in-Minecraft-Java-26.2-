import type { Skill, SkillRunOptions } from './Skill.js'
import { SkillErrorCode } from './SkillError.js'
import type { SkillResult } from './SkillResult.js'
import { SkillRunner } from './SkillRunner.js'

/**
 * Runtime registry for deterministic skills.
 * Higher-level planners/behavior trees can address skills by stable names
 * without knowing their concrete classes.
 */
export class SkillRegistry {
  private readonly skills = new Map<string, Skill<unknown, unknown>>()

  constructor(private readonly runner: SkillRunner) {}

  register<TParams, TData>(skill: Skill<TParams, TData>): this {
    this.skills.set(skill.name, skill as unknown as Skill<unknown, unknown>)
    return this
  }

  unregister(name: string): boolean {
    return this.skills.delete(name)
  }

  has(name: string): boolean {
    return this.skills.has(name)
  }

  list(): string[] {
    return [...this.skills.keys()].sort()
  }

  async run<TData = unknown>(
    name: string,
    params: unknown,
    options: SkillRunOptions = {}
  ): Promise<SkillResult<TData>> {
    const skill = this.skills.get(name)
    if (!skill) {
      const now = Date.now()
      return {
        success: false,
        status: 'failed',
        reason: `Skill not registered: ${name}`,
        errorCode: SkillErrorCode.SKILL_NOT_FOUND,
        attempts: 0,
        startedAt: now,
        finishedAt: now,
        durationMs: 0
      }
    }

    return this.runner.run(skill, params, options) as Promise<SkillResult<TData>>
  }
}
