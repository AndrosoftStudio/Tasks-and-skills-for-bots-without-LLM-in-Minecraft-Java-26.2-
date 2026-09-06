import type { Skill, SkillRunOptions } from './Skill.js'
import type { SkillContext } from './SkillContext.js'
import { SkillError, SkillErrorCode, toSkillError } from './SkillError.js'
import type { SkillResult, SkillStatus } from './SkillResult.js'
import { combineSignals, throwIfAborted } from '../../utils/async.js'

export class SkillRunner {
  constructor(private readonly baseContext: SkillContext) {}

  async run<TParams, TData>(
    skill: Skill<TParams, TData>,
    params: TParams,
    options: SkillRunOptions = {}
  ): Promise<SkillResult<TData>> {
    const startedAt = Date.now()
    const timeoutMs = Math.max(1, options.timeoutMs ?? skill.defaultTimeoutMs ?? 15_000)
    const maxAttempts = Math.max(1, options.maxAttempts ?? skill.defaultMaxAttempts ?? 1)
    const timeoutController = new AbortController()
    const timeout = setTimeout(() => {
      timeoutController.abort(new SkillError(SkillErrorCode.TIMEOUT, `${skill.name} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    const combinedSignal = combineSignals(
      this.baseContext.abortSignal,
      options.signal,
      timeoutController.signal
    )
    const context: SkillContext = { ...this.baseContext, abortSignal: combinedSignal }

    this.baseContext.logger.info(`[SKILL][${skill.name}] started`, { timeoutMs, maxAttempts })
    this.emit('skill:start', skill.name, { timeoutMs, maxAttempts })
    let attempts = 0

    try {
      throwIfAborted(combinedSignal)
      const canRun = await skill.canRun(context, params)
      if (!canRun) {
        throw new SkillError(SkillErrorCode.BOT_NOT_READY, `${skill.name} cannot run in the current state`)
      }

      while (attempts < maxAttempts) {
        attempts += 1
        throwIfAborted(combinedSignal)

        try {
          const data = await skill.execute(context, params)
          throwIfAborted(combinedSignal)

          const verified = await skill.verify(context, params, data)
          if (!verified) {
            throw new SkillError(SkillErrorCode.VERIFY_FAILED, `${skill.name} verification failed`)
          }

          const result = this.result<TData>('success', true, startedAt, attempts, data)
          this.baseContext.logger.info(`[SKILL][${skill.name}] success`, {
            attempts,
            durationMs: result.durationMs
          })
          this.emit('skill:success', skill.name, { attempts, durationMs: result.durationMs })
          return result
        } catch (rawError) {
          const error = toSkillError(rawError)
          if ([SkillErrorCode.CANCELLED, SkillErrorCode.TIMEOUT].includes(error.code)) throw error

          this.baseContext.logger.warn(`[SKILL][${skill.name}] execution failed`, {
            attempt: attempts,
            code: error.code,
            reason: error.message
          })
          this.emit('skill:recover', skill.name, {
            attempt: attempts,
            code: error.code,
            message: error.message
          })

          const action = await skill.recover(context, params, error, attempts)
          if (action !== 'retry' || attempts >= maxAttempts) throw error

          this.emit('skill:retry', skill.name, { nextAttempt: attempts + 1 })
        } finally {
          await this.safeCleanup(skill, context)
        }
      }

      throw new SkillError(SkillErrorCode.INTERNAL_ERROR, `${skill.name} exhausted attempts`)
    } catch (rawError) {
      const error = toSkillError(rawError)
      const status = this.statusFromError(error)
      const result = this.result<TData>(status, false, startedAt, attempts, undefined, error)
      this.baseContext.logger.warn(`[SKILL][${skill.name}] ${status}`, {
        code: error.code,
        reason: error.message,
        attempts
      })
      this.emit(`skill:${status}`, skill.name, { code: error.code, reason: error.message, attempts })
      return result
    } finally {
      clearTimeout(timeout)
    }
  }

  private async safeCleanup<TParams, TData>(skill: Skill<TParams, TData>, context: SkillContext): Promise<void> {
    if (!skill.cleanup) return
    try {
      await skill.cleanup(context)
    } catch (cleanupError) {
      context.logger.error(`[SKILL][${skill.name}] cleanup failed`, { cleanupError })
    }
  }

  private result<T>(
    status: SkillStatus,
    success: boolean,
    startedAt: number,
    attempts: number,
    data?: T,
    error?: SkillError
  ): SkillResult<T> {
    const finishedAt = Date.now()
    return {
      success,
      status,
      reason: error?.message,
      errorCode: error?.code,
      data,
      attempts,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt
    }
  }

  private statusFromError(error: SkillError): SkillStatus {
    if (error.code === SkillErrorCode.CANCELLED) return 'cancelled'
    if (error.code === SkillErrorCode.TIMEOUT) return 'timeout'
    if (error.code === SkillErrorCode.LOCKED) return 'blocked'
    return 'failed'
  }

  private emit(event: string, skill: string, payload: Record<string, unknown>): void {
    this.baseContext.events.emit(event, { skill, event, timestamp: Date.now(), ...payload })
  }
}
