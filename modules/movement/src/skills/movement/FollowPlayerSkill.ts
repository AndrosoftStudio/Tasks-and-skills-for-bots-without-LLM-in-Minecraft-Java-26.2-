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
import { TargetTracker } from './TargetTracker.js'
import type { FollowPlayerData, FollowPlayerParams, StuckKind } from './types.js'

export class FollowPlayerSkill implements Skill<FollowPlayerParams, FollowPlayerData> {
  readonly name = 'followPlayer'
  readonly defaultTimeoutMs = 60_000
  readonly defaultMaxAttempts = 4

  canRun(context: SkillContext): boolean { return context.state.ready }

  async execute(context: SkillContext, params: FollowPlayerParams): Promise<FollowPlayerData> {
    if (params.username.trim().length === 0) throw new SkillError(SkillErrorCode.INVALID_TARGET, 'followPlayer requires a username')

    const desired = Math.max(1, params.distance ?? 3)
    const softMax = Math.max(desired + 2, params.maxDistance ?? 48)
    const hardMax = Math.max(softMax + 8, params.hardMaxDistance ?? 96)
    const sprintDistance = Math.max(desired + 1, params.sprintDistance ?? 8)
    const updateInterval = Math.max(50, params.updateInterval ?? 100)
    const stableForMs = Math.max(0, params.stableForMs ?? 1200)
    const reacquireTimeout = Math.max(500, params.reacquireTimeoutMs ?? 8_000)
    const lastKnownTolerance = Math.max(0.8, params.lastKnownTolerance ?? 1.5)
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    const tracker = new TargetTracker()
    const engine = new LocalMovementEngine(context, 3)
    const stuck = new StuckDetector({ windowMs: 2800, minProgress: 0.18, minDisplacement: 0.18 })
    let stableSince: number | undefined
    let searchStep = 0

    try {
      while (true) {
        throwIfAborted(signal)
        const direct = context.bot.players[params.username]?.entity
        const matchedKey = direct ? undefined : Object.keys(context.bot.players).find(key => key.toLowerCase() === params.username.toLowerCase())
        const entity = direct ?? (matchedKey ? context.bot.players[matchedKey]?.entity : undefined)
        const observation = tracker.observe(entity?.position, Date.now())

        if (observation.reacquired) {
          stuck.reset()
          context.events.emit('movement:target-reacquired', {
            skill: this.name,
            event: 'movement:target-reacquired',
            timestamp: Date.now(),
            target: params.username,
            reacquisitions: tracker.reacquisitionCount
          })
        }

        if (!observation.visible) {
          stableSince = undefined
          context.movement.set('sprint', false)
          const lastKnown = observation.lastKnownPosition
          if (observation.lostForMs > reacquireTimeout) {
            throw new SkillError(SkillErrorCode.TARGET_NOT_FOUND, `Player ${params.username} was not reacquired within ${reacquireTimeout}ms`, {
              details: { lastKnownPosition: lastKnown, lostForMs: observation.lostForMs }
            })
          }

          if (lastKnown && distance3D(context.bot.entity.position, lastKnown) > lastKnownTolerance) {
            const distance = distance3D(context.bot.entity.position, lastKnown)
            const tick = await engine.tickToward(lastKnown, signal, {
              allowSprint: true,
              sprintDistance,
              distanceToTarget: distance,
              maxSafeDrop: 3,
              localAvoidance: params.localAvoidance ?? true
            })
            stuck.add(context.bot.entity.position, distance, Date.now(), context.bot.entity.velocity)
            const diagnosis = stuck.diagnose()
            if (diagnosis.kind !== 'none' && diagnosis.kind !== 'falling' && !(diagnosis.kind === 'no_progress' && diagnosis.averageSpeed > 0.12)) {
              throw new SkillError(SkillErrorCode.STUCK, `Stuck while seeking last known position of ${params.username}`, {
                details: { stuckKind: diagnosis.kind, diagnosis, lostTarget: true }
              })
            }
            if (tick.avoided) stuck.reset()
          } else {
            context.movement.stopHorizontal()
            context.movement.set('jump', false)
            if (searchStep % 4 === 0) await context.bot.look(context.bot.entity.yaw + Math.PI / 2, context.bot.entity.pitch, false)
            searchStep += 1
          }

          context.events.emit('movement:target-lost', {
            skill: this.name,
            event: 'movement:target-lost',
            timestamp: Date.now(),
            target: params.username,
            lostForMs: observation.lostForMs,
            lastKnownPosition: lastKnown
          })
          await sleep(updateInterval, signal)
          continue
        }

        const target = observation.position!
        const distance = distance3D(context.bot.entity.position, target)
        if (distance > hardMax) {
          throw new SkillError(SkillErrorCode.TARGET_TOO_FAR, `Player ${params.username} is ${distance.toFixed(1)} blocks away (hard max ${hardMax})`)
        }

        if (distance <= desired) {
          context.movement.stopHorizontal()
          context.movement.setMany({ jump: false, sneak: false })
          stableSince ??= Date.now()
          stuck.reset()
          if (stableForMs > 0 && Date.now() - stableSince >= stableForMs) {
            return {
              target: params.username,
              finalDistance: distance,
              finalPosition: context.bot.entity.position.clone(),
              reacquisitions: tracker.reacquisitionCount,
              lastKnownPosition: tracker.lastKnownPosition
            }
          }
        } else {
          stableSince = undefined
          stuck.add(context.bot.entity.position, distance, Date.now(), context.bot.entity.velocity)
          const diagnosis = stuck.diagnose()
          if (diagnosis.kind !== 'none' && diagnosis.kind !== 'falling' && !(diagnosis.kind === 'no_progress' && diagnosis.averageSpeed > 0.12)) {
            throw new SkillError(SkillErrorCode.STUCK, `Stuck while following ${params.username}: ${diagnosis.kind}`, {
              details: { stuckKind: diagnosis.kind, diagnosis }
            })
          }

          const tick = await engine.tickToward(target, signal, {
            allowSprint: distance >= sprintDistance || distance >= softMax,
            sprintDistance,
            distanceToTarget: distance,
            maxSafeDrop: 3,
            localAvoidance: params.localAvoidance ?? true
          })
          if (tick.avoided) stuck.reset()
        }

        context.events.emit('skill:progress', {
          skill: this.name,
          event: 'progress',
          timestamp: Date.now(),
          target: params.username,
          distanceRemaining: distance,
          reacquisitions: tracker.reacquisitionCount
        })
        await sleep(updateInterval, signal)
      }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(context: SkillContext, params: FollowPlayerParams): boolean {
    const direct = context.bot.players[params.username]?.entity
    const matchedKey = direct ? undefined : Object.keys(context.bot.players).find(key => key.toLowerCase() === params.username.toLowerCase())
    const entity = direct ?? (matchedKey ? context.bot.players[matchedKey]?.entity : undefined)
    return Boolean(entity && distance3D(context.bot.entity.position, entity.position) <= Math.max(1, params.distance ?? 3))
  }

  async recover(context: SkillContext, _params: FollowPlayerParams, error: SkillError, attempt: number): Promise<'retry' | 'fail'> {
    if (![SkillErrorCode.STUCK, SkillErrorCode.MOVEMENT_BLOCKED, SkillErrorCode.UNSAFE_MOVEMENT].includes(error.code)) return 'fail'
    const lease = await context.movementLock.acquire(`${this.name}:recover`, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    const probe = new SpatialProbe(context.bot).scanForward()
    const solver = new LocalObstacleSolver(context.bot)
    const avoidance = solver.decide(probe)
    const stuckKind = typeof error.details?.stuckKind === 'string' ? error.details.stuckKind as StuckKind : undefined
    const plan = new RecoveryPlanner().plan({ stuckKind, avoidance, attempt, unsafe: error.code === SkillErrorCode.UNSAFE_MOVEMENT })
    try {
      if (!plan) return 'fail'
      if (plan.action === 'wait') await sleep(plan.durationMs, signal)
      else await solver.act({ ...avoidance, action: plan.action, reason: plan.reason }, context.movement, signal, plan.durationMs)
      return 'retry'
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }
}
