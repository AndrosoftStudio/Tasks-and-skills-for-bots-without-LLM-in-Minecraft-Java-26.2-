import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { SkillContext } from '../src/skills/core/SkillContext.js'
import { SkillErrorCode } from '../src/skills/core/SkillError.js'
import { SkillRegistry } from '../src/skills/core/SkillRegistry.js'
import { SkillRunner } from '../src/skills/core/SkillRunner.js'

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

test('registry exposes registered skill names and structured missing-skill failure', async () => {
  const registry = new SkillRegistry(new SkillRunner(fakeContext()))
  registry.register({
    name: 'ping',
    canRun: () => true,
    execute: async () => ({ pong: true }),
    verify: () => true,
    recover: () => 'fail'
  })

  assert.equal(registry.has('ping'), true)
  assert.equal(registry.list()[0], 'ping')

  const missing = await registry.run('doesNotExist', {})
  assert.equal(missing.success, false)
  assert.equal(missing.errorCode, SkillErrorCode.SKILL_NOT_FOUND)
})
