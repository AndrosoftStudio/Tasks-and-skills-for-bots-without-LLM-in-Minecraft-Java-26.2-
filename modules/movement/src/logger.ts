import type { Logger } from './skills/core/SkillContext.js'

export const consoleLogger: Logger = {
  debug(message, meta) { console.debug(message, meta ?? '') },
  info(message, meta) { console.info(message, meta ?? '') },
  warn(message, meta) { console.warn(message, meta ?? '') },
  error(message, meta) { console.error(message, meta ?? '') }
}
