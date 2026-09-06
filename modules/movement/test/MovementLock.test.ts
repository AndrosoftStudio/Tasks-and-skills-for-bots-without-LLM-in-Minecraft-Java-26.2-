import test from 'node:test'
import assert from 'node:assert/strict'
import { MovementLock } from '../src/skills/movement/MovementLock.js'
import { SkillErrorCode } from '../src/skills/core/SkillError.js'

test('rejects a concurrent owner', async () => {
  const lock = new MovementLock()
  const first = await lock.acquire('moveTo')
  await assert.rejects(
    lock.acquire('followPlayer'),
    (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === SkillErrorCode.LOCKED
  )
  first.release()
  assert.equal(lock.isLocked, false)
})

test('preempt waits for previous lease cleanup/release before handoff', async () => {
  const lock = new MovementLock()
  const first = await lock.acquire('moveTo')
  const handoff = lock.acquire('escapeDanger', { mode: 'preempt', preemptWaitMs: 500 })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(first.signal.aborted, true)
  assert.equal(lock.owner, 'moveTo')
  first.release()
  const second = await handoff
  assert.equal(lock.owner, 'escapeDanger')
  second.release()
  assert.equal(lock.isLocked, false)
})
