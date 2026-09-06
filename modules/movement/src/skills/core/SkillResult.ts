import type { SkillErrorCode } from './SkillError.js'

export type SkillStatus = 'success' | 'failed' | 'cancelled' | 'timeout' | 'blocked'

export interface SkillResult<T = unknown> {
  success: boolean
  status: SkillStatus
  reason?: string
  errorCode?: SkillErrorCode
  data?: T
  attempts: number
  startedAt: number
  finishedAt: number
  durationMs: number
}
