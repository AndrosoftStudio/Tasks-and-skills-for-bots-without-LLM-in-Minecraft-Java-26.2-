import test from 'node:test'
import assert from 'node:assert/strict'
import { Vec3 } from 'vec3'
import { CachedNavigationWorld, type NavigationBlock, type NavigationWorld, type WorldInvalidation } from '../src/world/NavigationWorld.js'

class FakeWorld implements NavigationWorld {
  private rev = 0
  private readonly listeners = new Set<(event: WorldInvalidation) => void>()
  readonly reads = new Map<string, number>()

  revision(): number { return this.rev }
  onInvalidate(listener: (event: WorldInvalidation) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  getBlock(x: number, y: number, z: number): NavigationBlock {
    const key = `${Math.floor(x)}|${Math.floor(y)}|${Math.floor(z)}`
    this.reads.set(key, (this.reads.get(key) ?? 0) + 1)
    const p = new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))
    return { knowledge: 'known', name: 'stone', position: p, shapes: [[0,0,0,1,1,1]], boundingBox: 'block' }
  }
  emit(event: WorldInvalidation): void { this.rev += 1; for (const listener of this.listeners) listener(event) }
}

test('block invalidation does not flush unrelated cached positions', () => {
  const inner = new FakeWorld()
  const world = new CachedNavigationWorld(inner)
  world.getBlock(0, 64, 0)
  world.getBlock(100, 64, 100)
  world.getBlock(0, 64, 0)
  world.getBlock(100, 64, 100)
  assert.equal(inner.reads.get('0|64|0'), 1)
  assert.equal(inner.reads.get('100|64|100'), 1)

  inner.emit({ type: 'block', x: 0, y: 64, z: 0 })
  world.getBlock(0, 64, 0)
  world.getBlock(100, 64, 100)

  assert.equal(inner.reads.get('0|64|0'), 2)
  assert.equal(inner.reads.get('100|64|100'), 1)
})

test('chunk invalidation only evicts the affected chunk', () => {
  const inner = new FakeWorld()
  const world = new CachedNavigationWorld(inner)
  world.getBlock(1, 64, 1)
  world.getBlock(33, 64, 1)
  assert.equal(inner.reads.get('1|64|1'), 1)
  assert.equal(inner.reads.get('33|64|1'), 1)

  inner.emit({ type: 'chunk', x: 0, z: 0 })
  world.getBlock(1, 64, 1)
  world.getBlock(33, 64, 1)

  assert.equal(inner.reads.get('1|64|1'), 2)
  assert.equal(inner.reads.get('33|64|1'), 1)
})

test('generic NavigationWorld without invalidation events keeps safe global fallback', () => {
  let rev = 0
  let reads = 0
  const inner: NavigationWorld = {
    revision: () => rev,
    getBlock: (x, y, z) => { reads += 1; const p = new Vec3(Math.floor(x), Math.floor(y), Math.floor(z)); return { knowledge: 'known', name: 'stone', position: p, shapes: [[0,0,0,1,1,1]], boundingBox: 'block' } }
  }
  const world = new CachedNavigationWorld(inner)
  world.getBlock(5, 64, 5)
  world.getBlock(5, 64, 5)
  assert.equal(reads, 1)
  rev += 1
  world.getBlock(5, 64, 5)
  assert.equal(reads, 2)
})
