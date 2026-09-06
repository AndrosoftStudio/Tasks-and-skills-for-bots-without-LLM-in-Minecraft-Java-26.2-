import test from 'node:test'
import assert from 'node:assert/strict'
import type { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import { TerrainAnalyzer } from '../src/skills/movement/TerrainAnalyzer.js'

type Shape = [number, number, number, number, number, number]

function botWith(blockName: string, shapes: Shape[], velocityY = 0, onGround = true): Bot {
  return {
    entity: {
      position: new Vec3(0.5, 64, 0.5), velocity: new Vec3(0, velocityY, 0),
      yaw: 0, pitch: 0, onGround, height: 1.8
    },
    players: {}, food: 20,
    blockAt(p: Vec3) {
      const y = Math.floor(p.y)
      if (y === 64) return { name: blockName, position: new Vec3(0, 64, 0), shapes, boundingBox: shapes.length ? 'block' : 'empty' }
      if (y === 63) return { name: 'stone', position: new Vec3(0, 63, 0), shapes: [[0,0,0,1,1,1]], boundingBox: 'block' }
      return { name: 'air', position: new Vec3(0, y, 0), shapes: [], boundingBox: 'empty' }
    }
  } as unknown as Bot
}

test('detects swimming mode from water blocks', () => {
  assert.equal(new TerrainAnalyzer(botWith('water', [])).mode(), 'swimming')
})

test('detects climbing mode from ladder-like block', () => {
  assert.equal(new TerrainAnalyzer(botWith('ladder', [])).mode(), 'climbing')
})

test('detects falling separately from generic airborne', () => {
  assert.equal(new TerrainAnalyzer(botWith('air', [], -0.3, false)).mode(), 'falling')
})
