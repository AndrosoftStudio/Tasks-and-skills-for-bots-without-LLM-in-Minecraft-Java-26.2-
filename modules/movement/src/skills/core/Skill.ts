import type { SkillContext } from './SkillContext.js'
import type { SkillError } from './SkillError.js'

export interface SkillRunOptions {
  timeoutMs?: number
  maxAttempts?: number
  signal?: AbortSignal
}

export type RecoveryAction = 'retry' | 'fail'

export interface Skill<TParams, TData = unknown> {
  readonly name: string
  readonly defaultTimeoutMs?: number
  readonly defaultMaxAttempts?: number

  canRun(context: SkillContext, params: TParams): boolean | Promise<boolean>
  execute(context: SkillContext, params: TParams): Promise<TData>
  verify(context: SkillContext, params: TParams, data: TData): boolean | Promise<boolean>
  recover(
    context: SkillContext,
    params: TParams,
    error: SkillError,
    attempt: number
  ): RecoveryAction | Promise<RecoveryAction>
  cleanup?(context: SkillContext): void | Promise<void>
}
