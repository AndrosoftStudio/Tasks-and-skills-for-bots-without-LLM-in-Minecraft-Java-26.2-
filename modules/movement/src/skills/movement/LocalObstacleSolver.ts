import type { Bot } from 'mineflayer'
import type { MovementController } from './MovementController.js'
import { SpatialProbe } from './SpatialProbe.js'
import type { SpatialProbeResult, SuggestedAction } from './types.js'
import { sleep } from '../../utils/async.js'

export interface AvoidanceDecision {
  action: SuggestedAction
  reason: string
  source: SpatialProbeResult
  leftScore: number
  rightScore: number
}

export class LocalObstacleSolver {
  private readonly probe: SpatialProbe

  constructor(private readonly bot: Bot, maxSafeDrop = 3) {
    this.probe = new SpatialProbe(bot, { maxSafeDrop })
  }

  decide(source = this.probe.scanForward()): AvoidanceDecision {
    if (source.type === 'step') {
      return { action: 'jump', reason: source.reason ?? 'Step ahead', source, leftScore: 0, rightScore: 0 }
    }
    if (source.type === 'water') {
      return { action: 'swim', reason: source.reason ?? 'Water ahead', source, leftScore: 0, rightScore: 0 }
    }
    if (source.type === 'climbable') {
      return { action: 'climb', reason: source.reason ?? 'Climbable ahead', source, leftScore: 0, rightScore: 0 }
    }
    if (!source.obstacleDetected) {
      return { action: 'forward', reason: 'Forward corridor is clear', source, leftScore: 0, rightScore: 0 }
    }

    const turn = Math.PI / 3
    const left = this.probe.scanHeading(this.bot.entity.yaw - turn, 1.0)
    const right = this.probe.scanHeading(this.bot.entity.yaw + turn, 1.0)
    const leftScore = this.score(left)
    const rightScore = this.score(right)

    if (Math.max(leftScore, rightScore) < 0.35) {
      return { action: 'back', reason: 'No safe lateral corridor found', source, leftScore, rightScore }
    }
    return leftScore >= rightScore
      ? { action: 'left', reason: 'Left corridor has the best local clearance', source, leftScore, rightScore }
      : { action: 'right', reason: 'Right corridor has the best local clearance', source, leftScore, rightScore }
  }

  async act(decision: AvoidanceDecision, movement: MovementController, signal?: AbortSignal, sidestepMs = 420): Promise<void> {
    switch (decision.action) {
      case 'jump':
        await movement.pulse({ jump: true, forward: true }, 330, signal)
        break
      case 'left':
        await movement.pulse({ left: true, forward: true }, sidestepMs, signal)
        break
      case 'right':
        await movement.pulse({ right: true, forward: true }, sidestepMs, signal)
        break
      case 'back':
        await movement.pulse({ back: true }, Math.min(350, sidestepMs), signal)
        break
      case 'swim':
        movement.setMany({ forward: true, sprint: false, jump: true })
        await sleep(300, signal)
        movement.set('jump', false)
        break
      case 'climb':
        movement.setMany({ forward: true, jump: true, sprint: false })
        await sleep(350, signal)
        movement.set('jump', false)
        break
      case 'stop':
      case 'none':
        movement.stopAll()
        break
      case 'forward':
        movement.set('forward', true)
        break
    }
  }

  private score(scan: SpatialProbeResult): number {
    let score = scan.clearanceScore
    if (scan.type === 'lava' || scan.type === 'hazard' || scan.type === 'drop') score -= 1
    if (scan.type === 'wall' || scan.type === 'low_ceiling' || scan.type === 'door') score -= 0.5
    if (scan.type === 'step') score += 0.15
    return Math.max(0, Math.min(1, score))
  }
}
