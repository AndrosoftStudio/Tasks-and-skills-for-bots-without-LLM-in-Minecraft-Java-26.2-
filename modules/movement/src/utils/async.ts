import { SkillError, SkillErrorCode } from '../skills/core/SkillError.js'

export function abortReason(signal?: AbortSignal): unknown {
  return signal?.reason
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const reason = signal.reason
  if (reason instanceof SkillError) throw reason
  throw new SkillError(SkillErrorCode.CANCELLED, 'Skill execution was cancelled', { cause: reason })
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    throwIfAborted(signal)
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error
        ? signal.reason
        : new SkillError(SkillErrorCode.CANCELLED, 'Skill execution was cancelled', { cause: signal?.reason }))
      return
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    const onAbort = (): void => {
      cleanup()
      reject(signal?.reason instanceof Error
        ? signal.reason
        : new SkillError(SkillErrorCode.CANCELLED, 'Skill execution was cancelled', { cause: signal?.reason }))
    }

    const cleanup = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function combineSignals(...signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const present = signals.filter((value): value is AbortSignal => Boolean(value))
  if (present.length === 0) return undefined
  if (present.length === 1) return present[0]
  return AbortSignal.any(present)
}
