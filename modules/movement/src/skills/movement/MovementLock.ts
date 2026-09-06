import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { sleep, throwIfAborted } from '../../utils/async.js'

export type MovementLockMode = 'reject' | 'wait' | 'preempt'

export interface MovementLease {
  readonly owner: string
  readonly signal: AbortSignal
  release(): void
}

interface ActiveLease {
  owner: string
  controller: AbortController
  token: symbol
  released: Promise<void>
  resolveReleased: () => void
}

export class MovementLock {
  private active?: ActiveLease

  get owner(): string | undefined { return this.active?.owner }
  get isLocked(): boolean { return Boolean(this.active) }

  async acquire(
    owner: string,
    options: { mode?: MovementLockMode; signal?: AbortSignal; pollMs?: number; preemptWaitMs?: number } = {}
  ): Promise<MovementLease> {
    const mode = options.mode ?? 'reject'
    const pollMs = Math.max(5, options.pollMs ?? 25)
    throwIfAborted(options.signal)

    if (mode === 'preempt' && this.active) {
      const previous = this.active
      previous.controller.abort(new SkillError(
        SkillErrorCode.CANCELLED,
        `Movement ownership preempted by ${owner}`,
        { details: { previousOwner: previous.owner, nextOwner: owner } }
      ))
      const maxWait = Math.max(50, options.preemptWaitMs ?? 1000)
      const started = Date.now()
      while (this.active?.token === previous.token && Date.now() - started < maxWait) {
        await Promise.race([previous.released, sleep(pollMs, options.signal)])
      }
      if (this.active?.token === previous.token) {
        throw new SkillError(SkillErrorCode.LOCKED, `Preempted owner ${previous.owner} did not release movement in time`)
      }
    }

    if (mode === 'wait') {
      while (this.active) await sleep(pollMs, options.signal)
    } else if (this.active) {
      throw new SkillError(
        SkillErrorCode.LOCKED,
        `Movement is controlled by ${this.active.owner}`,
        { details: { owner: this.active.owner, requester: owner } }
      )
    }

    let resolveReleased!: () => void
    const released = new Promise<void>(resolve => { resolveReleased = resolve })
    const token = Symbol(owner)
    const controller = new AbortController()
    this.active = { owner, controller, token, released, resolveReleased }

    let didRelease = false
    const release = (): void => {
      if (didRelease) return
      didRelease = true
      if (this.active?.token === token) this.active = undefined
      resolveReleased()
    }

    return { owner, signal: controller.signal, release }
  }

  async waitForFree(signal?: AbortSignal, timeoutMs = 1000, pollMs = 20): Promise<boolean> {
    const started = Date.now()
    while (this.active && Date.now() - started < timeoutMs) {
      await sleep(pollMs, signal)
    }
    return !this.active
  }

  /**
   * Requests cancellation. Ownership is intentionally retained until the current
   * holder finishes cleanup and calls release(), preventing a handoff race.
   */
  cancelActive(reason = 'Movement cancelled'): void {
    if (!this.active || this.active.controller.signal.aborted) return
    this.active.controller.abort(new SkillError(SkillErrorCode.CANCELLED, reason))
  }
}
