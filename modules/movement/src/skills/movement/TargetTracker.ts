import type { Vec3 } from 'vec3'

export interface TargetObservation {
  visible: boolean
  position?: Vec3
  lastKnownPosition?: Vec3
  lostForMs: number
  reacquired: boolean
}

export class TargetTracker {
  private lastKnown?: Vec3
  private lostSince?: number
  private wasLost = false
  private reacquisitions = 0

  observe(position: Vec3 | undefined, now = Date.now()): TargetObservation {
    if (position) {
      const reacquired = this.wasLost
      if (reacquired) this.reacquisitions += 1
      this.lastKnown = position.clone()
      this.lostSince = undefined
      this.wasLost = false
      return {
        visible: true,
        position: position.clone(),
        lastKnownPosition: this.lastKnown.clone(),
        lostForMs: 0,
        reacquired
      }
    }

    this.lostSince ??= now
    this.wasLost = true
    return {
      visible: false,
      lastKnownPosition: this.lastKnown?.clone(),
      lostForMs: now - this.lostSince,
      reacquired: false
    }
  }

  get reacquisitionCount(): number { return this.reacquisitions }
  get lastKnownPosition(): Vec3 | undefined { return this.lastKnown?.clone() }
}
