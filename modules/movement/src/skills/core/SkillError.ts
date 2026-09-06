export enum SkillErrorCode {
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
  TARGET_TOO_FAR = 'TARGET_TOO_FAR',
  INVALID_TARGET = 'INVALID_TARGET',
  MOVEMENT_BLOCKED = 'MOVEMENT_BLOCKED',
  STUCK = 'STUCK',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  BOT_NOT_READY = 'BOT_NOT_READY',
  UNSAFE_MOVEMENT = 'UNSAFE_MOVEMENT',
  LOCKED = 'LOCKED',
  VERIFY_FAILED = 'VERIFY_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class SkillError extends Error {
  readonly code: SkillErrorCode
  readonly details?: Record<string, unknown>
  override readonly cause?: unknown

  constructor(
    code: SkillErrorCode,
    message: string,
    options: { details?: Record<string, unknown>; cause?: unknown } = {}
  ) {
    super(message)
    this.name = 'SkillError'
    this.code = code
    this.details = options.details
    this.cause = options.cause
  }
}

export function toSkillError(error: unknown): SkillError {
  if (error instanceof SkillError) return error
  if (error instanceof Error) {
    return new SkillError(SkillErrorCode.INTERNAL_ERROR, error.message, { cause: error })
  }
  return new SkillError(SkillErrorCode.INTERNAL_ERROR, 'Unknown skill error', { cause: error })
}
