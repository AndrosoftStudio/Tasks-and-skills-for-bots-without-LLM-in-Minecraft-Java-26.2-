import type { StuckKind, SuggestedAction } from './types.js'
import type { AvoidanceDecision } from './LocalObstacleSolver.js'

export interface RecoveryPlan {
  action: SuggestedAction | 'wait'
  durationMs: number
  reason: string
}

export class RecoveryPlanner {
  plan(input: { stuckKind?: StuckKind; avoidance?: AvoidanceDecision; attempt: number; unsafe?: boolean }): RecoveryPlan | undefined {
    const { stuckKind = 'none', avoidance, attempt, unsafe = false } = input

    if (stuckKind === 'falling') return { action: 'wait', durationMs: 350, reason: 'Wait for falling state to resolve before applying movement' }
    if (unsafe) {
      if (attempt === 1) return { action: 'back', durationMs: 320, reason: 'Retreat from unsafe terrain' }
      if (avoidance?.action === 'left' || avoidance?.action === 'right') {
        return { action: avoidance.action, durationMs: 460, reason: 'Sidestep into the safest locally scanned corridor' }
      }
      return undefined
    }
    if (avoidance?.action === 'jump' && attempt <= 2) return { action: 'jump', durationMs: 340, reason: 'Obstacle is a traversable step' }
    if (avoidance?.action === 'left' || avoidance?.action === 'right') {
      return { action: avoidance.action, durationMs: 440 + attempt * 50, reason: avoidance.reason }
    }
    if (stuckKind === 'no_motion' && attempt === 1) return { action: 'jump', durationMs: 330, reason: 'No movement detected; attempt step/jump escape' }
    if ((stuckKind === 'oscillating' || stuckKind === 'no_progress') && attempt <= 2) {
      return { action: attempt === 1 ? 'left' : 'right', durationMs: 500, reason: `Break ${stuckKind} with directional displacement` }
    }
    if (attempt <= 2) return { action: 'back', durationMs: 300, reason: 'Create space for a fresh local movement attempt' }
    return undefined
  }
}
