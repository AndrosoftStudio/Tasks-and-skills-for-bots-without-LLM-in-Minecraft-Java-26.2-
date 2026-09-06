import type { Vec3 } from 'vec3'

export type MovementControl = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint' | 'sneak'

export type LocomotionMode =
  | 'ground'
  | 'airborne'
  | 'falling'
  | 'swimming'
  | 'climbing'

export type StuckKind = 'none' | 'no_motion' | 'no_progress' | 'oscillating' | 'falling'

export interface MoveToParams {
  x: number
  y: number
  z: number
  tolerance?: number
  timeout?: number
  allowSprint?: boolean
  sprintDistance?: number
  maxAttempts?: number
  tickIntervalMs?: number
  progressWindowMs?: number
  minProgress?: number
  maxSafeDrop?: number
  localAvoidance?: boolean
}

export interface MoveToData {
  target: Vec3
  finalPosition: Vec3
  finalDistance: number
  recoveries: number
  locomotionModes: LocomotionMode[]
}

export interface FollowPlayerParams {
  username: string
  distance?: number
  maxDistance?: number
  hardMaxDistance?: number
  timeout?: number
  sprintDistance?: number
  updateInterval?: number
  stableForMs?: number
  maxAttempts?: number
  reacquireTimeoutMs?: number
  lastKnownTolerance?: number
  localAvoidance?: boolean
}

export interface FollowPlayerData {
  target: string
  finalDistance: number
  finalPosition: Vec3
  reacquisitions: number
  lastKnownPosition?: Vec3
}

export interface StopParams {
  cancelActive?: boolean
}

export interface JumpParams {
  duration?: number
  forward?: boolean
  sprint?: boolean
  cooldown?: number
}

export interface SprintParams {
  enabled: boolean
}

export interface EntityLike {
  position: Vec3
  height?: number
  id?: number
  name?: string
  username?: string
}

export type LookTarget =
  | { type: 'position'; position: Vec3 }
  | { type: 'coordinates'; x: number; y: number; z: number }
  | { type: 'entity'; entity: EntityLike; eyeOffset?: number }

export interface LookAtParams {
  target: LookTarget
  smooth?: boolean
  duration?: number
  steps?: number
}

export type ObstacleType =
  | 'none'
  | 'wall'
  | 'step'
  | 'low_ceiling'
  | 'drop'
  | 'lava'
  | 'water'
  | 'hazard'
  | 'climbable'
  | 'door'
  | 'unknown'

export type SuggestedAction =
  | 'none'
  | 'jump'
  | 'left'
  | 'right'
  | 'back'
  | 'stop'
  | 'swim'
  | 'climb'
  | 'forward'

export interface DropAnalysis {
  depth: number
  landingY?: number
  landingBlock?: string
  fluid?: 'water' | 'lava'
  hazard?: string
  safe: boolean
  reason: string
}

export interface ProbeLane {
  lateralOffset: number
  blocked: boolean
  stepHeight: number
  headBlocked: boolean
  water: boolean
  climbable: boolean
  door: boolean
  hazard?: string
  drop: DropAnalysis
}

export interface SpatialProbeResult {
  yaw: number
  distance: number
  lanes: ProbeLane[]
  obstacleDetected: boolean
  type: ObstacleType
  suggestedAction: SuggestedAction
  position?: Vec3
  reason?: string
  clearanceScore: number
  maxStepHeight: number
  safeDropDepth: number
}

export interface ObstacleInfo extends SpatialProbeResult {}

export interface AvoidObstacleParams {
  act?: boolean
  probeDistance?: number
  sidestepMs?: number
  maxSafeDrop?: number
}

export interface AvoidObstacleData extends ObstacleInfo {
  acted: boolean
}

export interface StepUpParams {
  timeout?: number
  forward?: boolean
  sprint?: boolean
  maxRise?: number
}

export interface StepUpData {
  startY: number
  finalY: number
  rise: number
}

export interface SafeDropParams {
  maxDepth?: number
  probeDistance?: number
  timeout?: number
}

export interface SafeDropData {
  analysis: DropAnalysis
  startY: number
  finalY: number
}

export interface ClimbParams {
  targetY: number
  tolerance?: number
  timeout?: number
}

export interface ClimbData {
  startY: number
  finalY: number
  targetY: number
}

export interface SwimParams {
  x?: number
  y?: number
  z?: number
  duration?: number
  tolerance?: number
  timeout?: number
}

export interface SwimData {
  finalPosition: Vec3
  target?: Vec3
}
