import type { Bot } from 'mineflayer'
import type { EventEmitter } from 'node:events'
import type { MovementController } from '../movement/MovementController.js'
import type { MovementLock } from '../movement/MovementLock.js'

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export interface BotState {
  ready: boolean
}

export interface SkillContext {
  bot: Bot
  movement: MovementController
  movementLock: MovementLock
  state: BotState
  logger: Logger
  events: EventEmitter
  abortSignal?: AbortSignal
}
