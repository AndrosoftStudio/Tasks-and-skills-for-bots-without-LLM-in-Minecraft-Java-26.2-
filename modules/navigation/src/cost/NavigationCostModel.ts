import type { Neighbor } from '../world/NeighborGenerator.js'
import type { NavigationOptions } from '../types/navigation.js'
import { HazardCostModel, type HazardProfile } from './HazardCostModel.js'

const actionMultiplier: Record<string, number> = {
  walk: 1,
  jump: 1.55,
  step_up: 1.3,
  step_down: 1.1,
  drop: 1.45,
  swim: 2.8,
  climb: 2.1,
  open_door: 3.5
}

export class NavigationCostModel {
  constructor(private readonly hazards = new HazardCostModel()) {}

  cost(n: Neighbor, o: NavigationOptions = {}): number {
    const profile: HazardProfile = o.profile ?? 'normal'
    let value = n.baseDistance * (actionMultiplier[n.action] ?? 1)

    const directHazardCost = this.hazards.directScore(n.node, profile)
    if (!Number.isFinite(directHazardCost)) return Infinity

    value += directHazardCost
    value += n.hazardScore

    const blockBelow = n.node.metadata?.blockBelow ?? ''
    if (blockBelow.includes('soul_sand')) value *= 2.2
    if (blockBelow.includes('honey')) value *= 1.8
    if (blockBelow.includes('ice')) value *= profile === 'safe' ? 1.35 : 1.05
    if (blockBelow.includes('slime')) value *= 1.2
    if (n.node.metadata?.requiresInteraction) value += 8

    return value
  }

  estimatedSeconds(cost: number): number {
    return cost / 4.1
  }
}
