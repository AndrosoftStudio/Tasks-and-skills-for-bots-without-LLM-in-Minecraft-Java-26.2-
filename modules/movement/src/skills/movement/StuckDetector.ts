import type { Vec3 } from 'vec3'
import { distance3D } from '../../utils/math.js'
import type { StuckKind } from './types.js'

interface Sample {
  time: number
  position: Vec3
  distanceToTarget: number
  speed?: number
  verticalVelocity?: number
}

export interface StuckDetectorOptions {
  windowMs?: number
  minProgress?: number
  minDisplacement?: number
  maxAverageSpeed?: number
  minimumSamples?: number
  oscillationPathRatio?: number
}

export interface StuckDiagnosis {
  kind: StuckKind
  progress: number
  displacement: number
  pathDistance: number
  averageSpeed: number
}

export class StuckDetector {
  private readonly samples: Sample[] = []
  private readonly windowMs: number
  private readonly minProgress: number
  private readonly minDisplacement: number
  private readonly maxAverageSpeed: number
  private readonly minimumSamples: number
  private readonly oscillationPathRatio: number

  constructor(options: StuckDetectorOptions = {}) {
    this.windowMs = options.windowMs ?? 2200
    this.minProgress = options.minProgress ?? 0.3
    this.minDisplacement = options.minDisplacement ?? 0.2
    this.maxAverageSpeed = options.maxAverageSpeed ?? 0.08
    this.minimumSamples = options.minimumSamples ?? 4
    this.oscillationPathRatio = options.oscillationPathRatio ?? 3.5
  }

  reset(): void { this.samples.length = 0 }

  add(position: Vec3, distanceToTarget: number, now = Date.now(), velocity?: Vec3): void {
    const speed = velocity ? Math.hypot(velocity.x, velocity.y, velocity.z) : undefined
    this.samples.push({
      time: now,
      position: position.clone(),
      distanceToTarget,
      speed,
      verticalVelocity: velocity?.y
    })
    const cutoff = now - this.windowMs
    while (this.samples.length > 0 && this.samples[0]!.time < cutoff) this.samples.shift()
  }

  diagnose(now = Date.now()): StuckDiagnosis {
    if (this.samples.length < this.minimumSamples) return this.empty('none')
    const first = this.samples[0]!
    const last = this.samples[this.samples.length - 1]!
    if (now - first.time < this.windowMs * 0.8) return this.empty('none')

    const progress = first.distanceToTarget - last.distanceToTarget
    const displacement = distance3D(first.position, last.position)
    let pathDistance = 0
    for (let i = 1; i < this.samples.length; i += 1) {
      pathDistance += distance3D(this.samples[i - 1]!.position, this.samples[i]!.position)
    }
    const speedSamples = this.samples.map(s => s.speed).filter((v): v is number => v !== undefined)
    const averageSpeed = speedSamples.length ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length : 0
    const fallingRatio = this.samples.filter(s => (s.verticalVelocity ?? 0) < -0.12).length / this.samples.length

    let kind: StuckKind = 'none'
    if (fallingRatio >= 0.6) kind = 'falling'
    else if (progress < this.minProgress && displacement < this.minDisplacement && averageSpeed <= this.maxAverageSpeed) kind = 'no_motion'
    else if (progress < this.minProgress && pathDistance > Math.max(this.minDisplacement * 2, displacement * this.oscillationPathRatio)) kind = 'oscillating'
    else if (progress < this.minProgress) kind = 'no_progress'

    return { kind, progress, displacement, pathDistance, averageSpeed }
  }

  isStuck(now = Date.now()): boolean {
    return this.diagnose(now).kind !== 'none'
  }

  private empty(kind: StuckKind): StuckDiagnosis {
    return { kind, progress: 0, displacement: 0, pathDistance: 0, averageSpeed: 0 }
  }
}
