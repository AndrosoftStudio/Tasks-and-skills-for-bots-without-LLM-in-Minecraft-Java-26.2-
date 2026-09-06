import { Vec3 } from 'vec3'
import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { combineSignals, sleep, throwIfAborted } from '../../utils/async.js'
import { distance3D } from '../../utils/math.js'
import { LocalMovementEngine } from './LocalMovementEngine.js'
import { LocalObstacleSolver } from './LocalObstacleSolver.js'
import { RecoveryPlanner } from './RecoveryPlanner.js'
import { SpatialProbe } from './SpatialProbe.js'
import { StuckDetector } from './StuckDetector.js'
import type { LocomotionMode, MoveToData, MoveToParams, StuckKind } from './types.js'

export class MoveToSkill implements Skill<MoveToParams, MoveToData> {
  readonly name = 'moveTo'
  readonly defaultTimeoutMs = 20_000
  readonly defaultMaxAttempts = 4

  canRun(context: SkillContext): boolean { return context.state.ready }

  async execute(context: SkillContext, params: MoveToParams): Promise<MoveToData> {
    if (![params.x, params.y, params.z].every(Number.isFinite)) {
      throw new SkillError(SkillErrorCode.INVALID_TARGET, 'moveTo requires finite x, y and z coordinates')
    }

    const target = new Vec3(params.x, params.y, params.z)
    const tolerance = Math.max(0.1, params.tolerance ?? 0.75)
    const interval = Math.max(35, params.tickIntervalMs ?? 75)
    const maxSafeDrop = Math.max(0, params.maxSafeDrop ?? 3)
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    const engine = new LocalMovementEngine(context, maxSafeDrop)
    const stuck = new StuckDetector({
      windowMs: params.progressWindowMs ?? 2500,
      minProgress: params.minProgress ?? 0.28,
      minDisplacement: 0.18
    })
    const modes = new Set<LocomotionMode>()
    let recoveries = 0
    let lastLog = 0

    try {
      while (true) {
        throwIfAborted(signal)
        const current = context.bot.entity.position
        const distance = distance3D(current, target)
        if (distance <= tolerance) {
          context.movement.stopAll()
          return {
            target,
            finalPosition: current.clone(),
            finalDistance: distance,
            recoveries,
            locomotionModes: [...modes]
          }
        }

        stuck.add(current, distance, Date.now(), context.bot.entity.velocity)
        const diagnosis = stuck.diagnose()
        if (diagnosis.kind !== 'none' && diagnosis.kind !== 'falling') {
          throw new SkillError(SkillErrorCode.STUCK, `Local movement is ${diagnosis.kind}`, {
            details: { stuckKind: diagnosis.kind, diagnosis, target: { x: target.x, y: target.y, z: target.z } }
          })
        }

        const tick = await engine.tickToward(target, signal, {
          allowSprint: params.allowSprint ?? true,
          sprintDistance: Math.max(2, params.sprintDistance ?? 5),
          distanceToTarget: distance,
          maxSafeDrop,
          localAvoidance: params.localAvoidance ?? true
        })
        modes.add(tick.mode)
        if (tick.avoided) {
          recoveries += 1
          stuck.reset()
          context.events.emit('movement:avoidance', {
            skill: this.name,
            event: 'movement:avoidance',
            timestamp: Date.now(),
            action: tick.recoveryAction,
            obstacle: tick.probe?.type
          })
        }

        const now = Date.now()
        if (now - lastLog >= 800) {
          context.logger.debug('[MOVEMENT][moveTo] progress', {
            distanceRemaining: Number(distance.toFixed(2)),
            mode: tick.mode,
            obstacle: tick.probe?.type ?? 'none'
          })
          context.events.emit('skill:progress', {
            skill: this.name,
            event: 'progress',
            timestamp: now,
            distanceRemaining: distance,
            mode: tick.mode,
            obstacle: tick.probe?.type ?? 'none'
          })
          lastLog = now
        }

        await sleep(interval, signal)
      }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(context: SkillContext, params: MoveToParams): boolean {
    return distance3D(context.bot.entity.position, new Vec3(params.x, params.y, params.z)) <= Math.max(0.1, params.tolerance ?? 0.75)
  }

  async recover(context: SkillContext, params: MoveToParams, error: SkillError, attempt: number): Promise<'retry' | 'fail'> {
    if (![SkillErrorCode.STUCK, SkillErrorCode.MOVEMENT_BLOCKED, SkillErrorCode.UNSAFE_MOVEMENT].includes(error.code)) return 'fail'

    const lease = await context.movementLock.acquire(`${this.name}:recover`, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    const maxSafeDrop = Math.max(0, params.maxSafeDrop ?? 3)
    const probe = new SpatialProbe(context.bot, { maxSafeDrop }).scanForward(0.95, maxSafeDrop)
    const solver = new LocalObstacleSolver(context.bot, maxSafeDrop)
    const avoidance = solver.decide(probe)
    const stuckKind = typeof error.details?.stuckKind === 'string' ? error.details.stuckKind as StuckKind : undefined
    const plan = new RecoveryPlanner().plan({
      stuckKind,
      avoidance,
      attempt,
      unsafe: error.code === SkillErrorCode.UNSAFE_MOVEMENT
    })

    try {
      if (!plan) return 'fail'
      context.logger.warn('[MOVEMENT][moveTo] recovery', { code: error.code, attempt, action: plan.action, reason: plan.reason })
      context.events.emit('movement:recovery-plan', {
        skill: this.name,
        event: 'movement:recovery-plan',
        timestamp: Date.now(),
        attempt,
        action: plan.action,
        reason: plan.reason
      })
      if (plan.action === 'wait') await sleep(plan.durationMs, signal)
      else await solver.act({ ...avoidance, action: plan.action, reason: plan.reason }, context.movement, signal, plan.durationMs)
      return 'retry'
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }
}
