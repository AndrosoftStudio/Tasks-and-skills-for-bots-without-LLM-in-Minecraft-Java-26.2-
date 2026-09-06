import test from 'node:test'
import assert from 'node:assert/strict'
import type { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import { SpatialProbe } from '../src/skills/movement/SpatialProbe.js'

type Shape = [number, number, number, number, number, number]

function fakeBot(blocks: Map<string, { name: string; shapes: Shape[]; waterlogged?: boolean }>, position = new Vec3(0.5, 64, 0.5)): Bot {
  return {
    entity: {
      position,
      velocity: new Vec3(0, 0, 0),
      yaw: Math.PI,
      pitch: 0,
      onGround: true,
      height: 1.8
    },
    food: 20,
    players: {},
    blockAt(p: Vec3) {
      const key = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`
      const value = blocks.get(key)
      if (!value) return {
        name: 'air', position: new Vec3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)),
        shapes: [], boundingBox: 'empty'
      }
      return {
        name: value.name,
        position: new Vec3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)),
        shapes: value.shapes,
        boundingBox: value.shapes.length ? 'block' : 'empty',
        isWaterlogged: value.waterlogged
      }
    }
  } as unknown as Bot
}

const FULL: Shape[] = [[0, 0, 0, 1, 1, 1]]
const SLAB: Shape[] = [[0, 0, 0, 1, 0.5, 1]]

test('uses partial collision shapes to identify a traversable step', () => {
  const blocks = new Map<string, { name: string; shapes: Shape[] }>()
  blocks.set('0,63,0', { name: 'stone', shapes: FULL })
  blocks.set('0,64,1', { name: 'oak_slab', shapes: SLAB })
  blocks.set('0,63,1', { name: 'stone', shapes: FULL })
  const probe = new SpatialProbe(fakeBot(blocks)).scanHeading(Math.PI, 0.9)
  assert.equal(probe.type, 'step')
  assert.ok(probe.maxStepHeight > 0.4 && probe.maxStepHeight < 0.6)
})

test('rejects an unsafe deep drop across the body corridor', () => {
  const blocks = new Map<string, { name: string; shapes: Shape[] }>()
  blocks.set('0,63,0', { name: 'stone', shapes: FULL })
  blocks.set('0,59,1', { name: 'stone', shapes: FULL })
  const probe = new SpatialProbe(fakeBot(blocks), { maxSafeDrop: 3 }).scanHeading(Math.PI, 0.9, 3)
  assert.equal(probe.type, 'drop')
  assert.equal(probe.obstacleDetected, true)
})


test('detects an obstacle touching only a side lane of the body corridor', () => {
  const blocks = new Map<string, { name: string; shapes: Shape[] }>()
  blocks.set('0,63,0', { name: 'stone', shapes: FULL })
  blocks.set('0,63,1', { name: 'stone', shapes: FULL })
  blocks.set('1,63,1', { name: 'stone', shapes: FULL })
  blocks.set('1,64,1', { name: 'stone', shapes: FULL })
  const probe = new SpatialProbe(fakeBot(blocks, new Vec3(0.85, 64, 0.5))).scanHeading(Math.PI, 0.9)
  assert.equal(probe.obstacleDetected, true)
  assert.ok(probe.lanes.some(lane => lane.blocked))
})

test('treats a hazardous landing block as unsafe even with zero drop depth', () => {
  const blocks = new Map<string, { name: string; shapes: Shape[] }>()
  blocks.set('0,63,0', { name: 'stone', shapes: FULL })
  blocks.set('0,63,1', { name: 'magma_block', shapes: FULL })
  const probe = new SpatialProbe(fakeBot(blocks)).scanHeading(Math.PI, 0.9)
  assert.equal(probe.type, 'hazard')
})
