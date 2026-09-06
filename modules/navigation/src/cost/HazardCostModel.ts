import type { NavigationNode, NavigationOptions } from '../types/navigation.js'

export type HazardProfile = NonNullable<NavigationOptions['profile']>

const PROFILE_MULTIPLIER: Record<HazardProfile, number> = {
  fast: 0.65,
  normal: 1,
  safe: 1.75
}

export class HazardCostModel {
  directScore(node: NavigationNode, profile: HazardProfile = 'normal'): number {
    const hazard = node.metadata?.hazard
    if (!hazard) return 0
    const base = this.baseSeverity(hazard)
    if (!Number.isFinite(base)) return Infinity
    return base * PROFILE_MULTIPLIER[profile]
  }

  proximityScore(hazardName: string, distance: number, profile: HazardProfile = 'normal'): number {
    const d = Math.max(0.25, distance)
    const base = this.proximitySeverity(hazardName)
    return (base / (1 + d)) * PROFILE_MULTIPLIER[profile]
  }

  private baseSeverity(name: string): number {
    if (name.includes('lava')) return Infinity
    if (name.includes('fire') || name.includes('cactus') || name.includes('campfire')) return 25
    if (name.includes('magma') || name.includes('powder_snow')) return 18
    if (name.includes('sweet_berry_bush')) return 14
    return 10
  }

  private proximitySeverity(name: string): number {
    if (name.includes('lava')) return 42
    if (name.includes('fire') || name.includes('campfire')) return 22
    if (name.includes('cactus')) return 18
    if (name.includes('magma') || name.includes('powder_snow')) return 14
    if (name.includes('sweet_berry_bush')) return 10
    return 8
  }
}
