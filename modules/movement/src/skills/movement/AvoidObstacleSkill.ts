import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { combineSignals } from '../../utils/async.js'
import { LocalObstacleSolver } from './LocalObstacleSolver.js'
import { SpatialProbe } from './SpatialProbe.js'
import type { AvoidObstacleData, AvoidObstacleParams } from './types.js'

export class AvoidObstacleSkill implements Skill<AvoidObstacleParams, AvoidObstacleData> {
  readonly name = 'avoidObstacle'
  readonly defaultTimeoutMs = 3_000

  canRun(context: SkillContext): boolean { return context.state.ready }

  async execute(context: SkillContext, params: AvoidObstacleParams): Promise<AvoidObstacleData> {
    const maxSafeDrop = Math.max(0, params.maxSafeDrop ?? 3)
    const probe = new SpatialProbe(context.bot, { maxSafeDrop })
    const info = probe.scanForward(params.probeDistance ?? 0.95, maxSafeDrop)
    if (!(params.act ?? false) || info.type === 'none') return { ...info, acted: false }

    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    const solver = new LocalObstacleSolver(context.bot, maxSafeDrop)

    try {
      const decision = solver.decide(info)
      await solver.act(decision, context.movement, signal, Math.max(120, params.sidestepMs ?? 420))
      return { ...info, suggestedAction: decision.action, acted: true }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(): boolean { return true }
  recover(): 'fail' { return 'fail' }
}
