import { EventEmitter } from 'node:events'
import type { Bot } from 'mineflayer'
import type { Logger, SkillContext } from '../core/SkillContext.js'
import type { SkillRunOptions } from '../core/Skill.js'
import type { SkillResult } from '../core/SkillResult.js'
import { SkillRunner } from '../core/SkillRunner.js'
import { SkillRegistry } from '../core/SkillRegistry.js'
import { consoleLogger } from '../../logger.js'
import { MovementController } from './MovementController.js'
import { MovementLock } from './MovementLock.js'
import { MoveToSkill } from './MoveToSkill.js'
import { FollowPlayerSkill } from './FollowPlayerSkill.js'
import { StopSkill } from './StopSkill.js'
import { JumpSkill } from './JumpSkill.js'
import { SprintSkill } from './SprintSkill.js'
import { LookAtSkill } from './LookAtSkill.js'
import { AvoidObstacleSkill } from './AvoidObstacleSkill.js'
import { StepUpSkill } from './StepUpSkill.js'
import { SafeDropSkill } from './SafeDropSkill.js'
import { ClimbSkill } from './ClimbSkill.js'
import { SwimSkill } from './SwimSkill.js'
import type {
  AvoidObstacleData, AvoidObstacleParams, ClimbData, ClimbParams,
  FollowPlayerData, FollowPlayerParams, JumpParams, LookAtParams,
  MoveToData, MoveToParams, SafeDropData, SafeDropParams,
  SprintParams, StepUpData, StepUpParams, StopParams, SwimData, SwimParams
} from './types.js'

export interface MovementSkillsOptions {
  logger?: Logger
  events?: EventEmitter
  stateReady?: () => boolean
  abortSignal?: AbortSignal
}

export interface MovementSkills {
  readonly controller: MovementController
  readonly lock: MovementLock
  readonly events: EventEmitter
  readonly registry: SkillRegistry
  run<TData = unknown>(name: string, params: unknown, options?: SkillRunOptions): Promise<SkillResult<TData>>
  moveTo(params: MoveToParams, options?: SkillRunOptions): Promise<SkillResult<MoveToData>>
  followPlayer(params: FollowPlayerParams, options?: SkillRunOptions): Promise<SkillResult<FollowPlayerData>>
  stop(params?: StopParams, options?: SkillRunOptions): Promise<SkillResult<{ stopped: true }>>
  jump(params?: JumpParams, options?: SkillRunOptions): Promise<SkillResult<{ jumped: true }>>
  sprint(params: SprintParams, options?: SkillRunOptions): Promise<SkillResult<{ enabled: boolean }>>
  lookAt(params: LookAtParams, options?: SkillRunOptions): Promise<SkillResult<{ target: import('vec3').Vec3 }>>
  avoidObstacle(params?: AvoidObstacleParams, options?: SkillRunOptions): Promise<SkillResult<AvoidObstacleData>>
  stepUp(params?: StepUpParams, options?: SkillRunOptions): Promise<SkillResult<StepUpData>>
  safeDrop(params?: SafeDropParams, options?: SkillRunOptions): Promise<SkillResult<SafeDropData>>
  climb(params: ClimbParams, options?: SkillRunOptions): Promise<SkillResult<ClimbData>>
  swim(params?: SwimParams, options?: SkillRunOptions): Promise<SkillResult<SwimData>>
}

export function createMovementSkills(bot: Bot, options: MovementSkillsOptions = {}): MovementSkills {
  const controller = new MovementController(bot)
  const lock = new MovementLock()
  const events = options.events ?? new EventEmitter()
  const context: SkillContext = {
    bot,
    movement: controller,
    movementLock: lock,
    state: { get ready() { return options.stateReady?.() ?? Boolean(bot.entity) } },
    logger: options.logger ?? consoleLogger,
    events,
    abortSignal: options.abortSignal
  }
  const runner = new SkillRunner(context)
  const registry = new SkillRegistry(runner)

  const moveToSkill = new MoveToSkill()
  const followPlayerSkill = new FollowPlayerSkill()
  const stopSkill = new StopSkill()
  const jumpSkill = new JumpSkill()
  const sprintSkill = new SprintSkill()
  const lookAtSkill = new LookAtSkill()
  const avoidObstacleSkill = new AvoidObstacleSkill()
  const stepUpSkill = new StepUpSkill()
  const safeDropSkill = new SafeDropSkill()
  const climbSkill = new ClimbSkill()
  const swimSkill = new SwimSkill()

  registry.register(moveToSkill).register(followPlayerSkill).register(stopSkill)
    .register(jumpSkill).register(sprintSkill).register(lookAtSkill)
    .register(avoidObstacleSkill).register(stepUpSkill).register(safeDropSkill)
    .register(climbSkill).register(swimSkill)

  return {
    controller, lock, events, registry,
    run: (name, params, runOptions = {}) => registry.run(name, params, runOptions),
    moveTo: (params, runOptions = {}) => runner.run(moveToSkill, params, {
      ...runOptions,
      timeoutMs: runOptions.timeoutMs ?? params.timeout,
      maxAttempts: runOptions.maxAttempts ?? params.maxAttempts
    }),
    followPlayer: (params, runOptions = {}) => runner.run(followPlayerSkill, params, {
      ...runOptions,
      timeoutMs: runOptions.timeoutMs ?? params.timeout,
      maxAttempts: runOptions.maxAttempts ?? params.maxAttempts
    }),
    stop: (params = {}, runOptions = {}) => runner.run(stopSkill, params, runOptions),
    jump: (params = {}, runOptions = {}) => runner.run(jumpSkill, params, runOptions),
    sprint: (params, runOptions = {}) => runner.run(sprintSkill, params, runOptions),
    lookAt: (params, runOptions = {}) => runner.run(lookAtSkill, params, runOptions),
    avoidObstacle: (params = {}, runOptions = {}) => runner.run(avoidObstacleSkill, params, runOptions),
    stepUp: (params = {}, runOptions = {}) => runner.run(stepUpSkill, params, { ...runOptions, timeoutMs: runOptions.timeoutMs ?? params.timeout }),
    safeDrop: (params = {}, runOptions = {}) => runner.run(safeDropSkill, params, { ...runOptions, timeoutMs: runOptions.timeoutMs ?? params.timeout }),
    climb: (params, runOptions = {}) => runner.run(climbSkill, params, { ...runOptions, timeoutMs: runOptions.timeoutMs ?? params.timeout }),
    swim: (params = {}, runOptions = {}) => runner.run(swimSkill, params, { ...runOptions, timeoutMs: runOptions.timeoutMs ?? params.timeout })
  }
}

export * from './types.js'
export * from './MovementController.js'
export * from './MovementLock.js'
export * from './StuckDetector.js'
export * from './TerrainAnalyzer.js'
export * from './SpatialProbe.js'
export * from './LocalObstacleSolver.js'
export * from './LocalMovementEngine.js'
export * from './RecoveryPlanner.js'
export * from './TargetTracker.js'
export * from './obstacles.js'
export * from './MoveToSkill.js'
export * from './FollowPlayerSkill.js'
export * from './StopSkill.js'
export * from './JumpSkill.js'
export * from './SprintSkill.js'
export * from './LookAtSkill.js'
export * from './AvoidObstacleSkill.js'
export * from './StepUpSkill.js'
export * from './SafeDropSkill.js'
export * from './ClimbSkill.js'
export * from './SwimSkill.js'
