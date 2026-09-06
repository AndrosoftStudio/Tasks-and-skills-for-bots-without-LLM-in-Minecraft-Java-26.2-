import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { combineSignals, sleep, throwIfAborted } from '../../utils/async.js'
import { SpatialProbe } from './SpatialProbe.js'
import type { SafeDropData, SafeDropParams } from './types.js'

export class SafeDropSkill implements Skill<SafeDropParams, SafeDropData> {
  readonly name = 'safeDrop'
  readonly defaultTimeoutMs = 4_000
  readonly defaultMaxAttempts = 1

  canRun(context: SkillContext): boolean { return context.state.ready }

  async execute(context: SkillContext, params: SafeDropParams): Promise<SafeDropData> {
    const maxDepth = Math.max(0.5, params.maxDepth ?? 3)
    const probe = new SpatialProbe(context.bot, { maxSafeDrop: maxDepth }).scanForward(params.probeDistance ?? 0.85, maxDepth)
    const center = probe.lanes[Math.floor(probe.lanes.length / 2)]
    if (!center) throw new SkillError(SkillErrorCode.INTERNAL_ERROR, 'safeDrop probe has no center lane')
    const unsafeLane = probe.lanes.find(lane => !lane.drop.safe)
    if (unsafeLane || center.drop.depth <= 0.25) {
      const drop = unsafeLane?.drop ?? center.drop
      throw new SkillError(SkillErrorCode.UNSAFE_MOVEMENT, drop.reason, { details: { drop, obstacle: probe } })
    }

    const startY = context.bot.entity.position.y
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)
    try {
      context.movement.setMany({ forward: true, sprint: false, jump: false, sneak: false })
      const edgeStart = Date.now()
      while (context.bot.entity.onGround && Date.now() - edgeStart < 1200) {
        throwIfAborted(signal)
        await sleep(40, signal)
      }
      context.movement.stopHorizontal()
      const fallStart = Date.now()
      while (!context.bot.entity.onGround && Date.now() - fallStart < 2200) {
        throwIfAborted(signal)
        await sleep(40, signal)
      }
      const finalY = context.bot.entity.position.y
      if (!context.bot.entity.onGround && center.drop.fluid !== 'water') {
        throw new SkillError(SkillErrorCode.TIMEOUT, 'safeDrop did not observe a landing in time')
      }
      return { analysis: center.drop, startY, finalY }
    } finally {
      context.movement.stopAll()
      lease.release()
    }
  }

  verify(_context: SkillContext, _params: SafeDropParams, data: SafeDropData): boolean {
    return data.analysis.safe && data.finalY < data.startY - 0.15
  }

  recover(): 'fail' { return 'fail' }
}
