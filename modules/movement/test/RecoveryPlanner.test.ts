import test from 'node:test'
import assert from 'node:assert/strict'
import { RecoveryPlanner } from '../src/skills/movement/RecoveryPlanner.js'

test('does not jump forward when recovery is marked unsafe', () => {
  const planner = new RecoveryPlanner()
  const plan = planner.plan({ attempt: 1, unsafe: true, stuckKind: 'no_motion' })
  assert.equal(plan?.action, 'back')
})

test('waits instead of fighting physics while falling', () => {
  const planner = new RecoveryPlanner()
  const plan = planner.plan({ attempt: 1, stuckKind: 'falling' })
  assert.equal(plan?.action, 'wait')
})
