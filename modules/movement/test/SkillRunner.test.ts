import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { Skill } from '../src/skills/core/Skill.js'
import type { SkillContext } from '../src/skills/core/SkillContext.js'
import { SkillRunner } from '../src/skills/core/SkillRunner.js'
import { SkillErrorCode } from '../src/skills/core/SkillError.js'

function fakeContext(): SkillContext {
  return {
    bot: {} as SkillContext['bot'],
    movement: { stopAll() {} } as SkillContext['movement'],
    movementLock: {} as SkillContext['movementLock'],
    state: { ready: true },
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    events: new EventEmitter()
  }
}

test('runs and verifies a skill', async () => {
  const skill: Skill<{ value: number }, number> = {
    name: 'test',
    canRun: () => true,
    execute: async (_context, params) => params.value * 2,
    verify: (_context, _params, data) => data === 10,
    recover: () => 'fail'
  }
  const result = await new SkillRunner(fakeContext()).run(skill, { value: 5 })
  assert.equal(result.success, true)
  assert.equal(result.data, 10)
})

test('returns timeout and does not throw raw errors', async () => {
  const skill: Skill<Record<string, never>, void> = {
    name: 'slow',
    canRun: () => true,
    execute: async context => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 1000)
        context.abortSignal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(context.abortSignal?.reason)
        }, { once: true })
      })
    },
    verify: () => true,
    recover: () => 'fail'
  }
  const result = await new SkillRunner(fakeContext()).run(skill, {}, { timeoutMs: 20 })
  assert.equal(result.status, 'timeout')
  assert.equal(result.errorCode, SkillErrorCode.TIMEOUT)
})
