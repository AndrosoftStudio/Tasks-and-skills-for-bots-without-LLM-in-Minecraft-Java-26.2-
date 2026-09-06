import test from 'node:test'
import assert from 'node:assert/strict'
import { Vec3 } from 'vec3'
import { distance2D, distance3D, normalizeAngle, shortestAngleDelta } from '../src/utils/math.js'

test('distance helpers', () => {
  assert.equal(distance2D(new Vec3(0, 100, 0), new Vec3(3, -50, 4)), 5)
  assert.equal(distance3D(new Vec3(0, 0, 0), new Vec3(2, 3, 6)), 7)
})

test('angle normalization chooses shortest path', () => {
  const tenDegrees = Math.PI / 18
  const from = Math.PI - tenDegrees / 2
  const to = -Math.PI + tenDegrees / 2
  assert.ok(Math.abs(shortestAngleDelta(from, to) - tenDegrees) < 1e-9)
  assert.ok(normalizeAngle(3 * Math.PI) <= Math.PI)
})
