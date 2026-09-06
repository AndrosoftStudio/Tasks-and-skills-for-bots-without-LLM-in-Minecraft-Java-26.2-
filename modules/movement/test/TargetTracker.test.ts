import test from 'node:test'
import assert from 'node:assert/strict'
import { Vec3 } from 'vec3'
import { TargetTracker } from '../src/skills/movement/TargetTracker.js'

test('keeps last known position and counts reacquisition', () => {
  const tracker = new TargetTracker()
  tracker.observe(new Vec3(10, 64, 5), 1000)
  const lost = tracker.observe(undefined, 1500)
  assert.equal(lost.visible, false)
  assert.equal(lost.lastKnownPosition?.x, 10)
  assert.equal(lost.lostForMs, 0)
  const stillLost = tracker.observe(undefined, 2200)
  assert.equal(stillLost.lostForMs, 700)
  const reacquired = tracker.observe(new Vec3(12, 64, 5), 2300)
  assert.equal(reacquired.reacquired, true)
  assert.equal(tracker.reacquisitionCount, 1)
})
