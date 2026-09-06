import { Vec3 } from 'vec3'
import type { Skill } from '../core/Skill.js'
import type { SkillContext } from '../core/SkillContext.js'
import { SkillError, SkillErrorCode } from '../core/SkillError.js'
import { combineSignals, sleep, throwIfAborted } from '../../utils/async.js'
import { clamp, shortestAngleDelta } from '../../utils/math.js'
import type { LookAtParams, LookTarget } from './types.js'

function resolveTarget(target: LookTarget): Vec3 {
  if (target.type === 'position') return target.position.clone()
  if (target.type === 'coordinates') return new Vec3(target.x, target.y, target.z)
  return target.entity.position.offset(0, target.eyeOffset ?? (target.entity.height ?? 1.62) * 0.85, 0)
}

function targetAngles(origin: Vec3, target: Vec3): { yaw: number; pitch: number } {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const dz = target.z - origin.z
  const horizontal = Math.sqrt(dx * dx + dz * dz)
  const yaw = Math.atan2(-dx, -dz)
  const pitch = Math.atan2(dy, horizontal)
  return { yaw, pitch }
}

export class LookAtSkill implements Skill<LookAtParams, { target: Vec3 }> {
  readonly name = 'lookAt'
  readonly defaultTimeoutMs = 3_000

  canRun(context: SkillContext): boolean {
    return context.state.ready
  }

  async execute(context: SkillContext, params: LookAtParams): Promise<{ target: Vec3 }> {
    const target = resolveTarget(params.target)
    if (![target.x, target.y, target.z].every(Number.isFinite)) {
      throw new SkillError(SkillErrorCode.INVALID_TARGET, 'lookAt target contains non-finite coordinates')
    }
    const lease = await context.movementLock.acquire(this.name, { mode: 'reject', signal: context.abortSignal })
    const signal = combineSignals(context.abortSignal, lease.signal)

    try {
      if (!(params.smooth ?? false)) {
        await context.bot.lookAt(target, true)
        return { target }
      }

      const duration = Math.max(50, params.duration ?? 300)
      const steps = Math.max(2, params.steps ?? Math.round(duration / 40))
      const origin = context.bot.entity.position.offset(0, context.bot.entity.height ?? 1.62, 0)
      const desired = targetAngles(origin, target)
      const startYaw = context.bot.entity.yaw
      const startPitch = context.bot.entity.pitch
      const yawDelta = shortestAngleDelta(startYaw, desired.yaw)
      const pitchDelta = desired.pitch - startPitch

      for (let i = 1; i <= steps; i += 1) {
        throwIfAborted(signal)
        const t = i / steps
        await context.bot.look(
          startYaw + yawDelta * t,
          clamp(startPitch + pitchDelta * t, -Math.PI / 2, Math.PI / 2),
          true
        )
        await sleep(duration / steps, signal)
      }
      return { target }
    } finally {
      lease.release()
    }
  }

  verify(_context: SkillContext): boolean {
    return true
  }

  recover(): 'fail' { return 'fail' }
}
