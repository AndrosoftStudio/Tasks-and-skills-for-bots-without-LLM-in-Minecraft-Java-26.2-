import test from 'node:test'
import assert from 'node:assert/strict'
import { Vec3 } from 'vec3'
import { StuckDetector } from '../src/skills/movement/StuckDetector.js'

test('detects lack of motion as no_motion', () => {
  const detector = new StuckDetector({ windowMs: 1000, minProgress: 0.3, minDisplacement: 0.2, minimumSamples: 4 })
  detector.add(new Vec3(0, 0, 0), 10, 0, new Vec3(0, 0, 0))
  detector.add(new Vec3(0.02, 0, 0), 9.98, 300, new Vec3(0.01, 0, 0))
  detector.add(new Vec3(0.03, 0, 0), 9.97, 600, new Vec3(0.01, 0, 0))
  detector.add(new Vec3(0.04, 0, 0), 9.96, 900, new Vec3(0.01, 0, 0))
  assert.equal(detector.diagnose(900).kind, 'no_motion')
})

test('detects oscillation separately from no motion', () => {
  const detector = new StuckDetector({ windowMs: 1000, minProgress: 0.3, minDisplacement: 0.2, minimumSamples: 4, oscillationPathRatio: 2 })
  detector.add(new Vec3(0, 0, 0), 10, 0, new Vec3(0.2, 0, 0))
  detector.add(new Vec3(0.5, 0, 0), 9.95, 300, new Vec3(0.2, 0, 0))
  detector.add(new Vec3(-0.5, 0, 0), 10.05, 600, new Vec3(-0.2, 0, 0))
  detector.add(new Vec3(0.05, 0, 0), 9.96, 900, new Vec3(0.2, 0, 0))
  assert.equal(detector.diagnose(900).kind, 'oscillating')
})

test('does not flag real progress', () => {
  const detector = new StuckDetector({ windowMs: 1000, minProgress: 0.3, minDisplacement: 0.2, minimumSamples: 4 })
  detector.add(new Vec3(0, 0, 0), 10, 0)
  detector.add(new Vec3(0.5, 0, 0), 9.5, 300)
  detector.add(new Vec3(1, 0, 0), 9, 600)
  detector.add(new Vec3(1.5, 0, 0), 8.5, 900)
  assert.equal(detector.isStuck(900), false)
})
