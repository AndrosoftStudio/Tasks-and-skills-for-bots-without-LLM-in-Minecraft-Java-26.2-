import test from 'node:test'
import assert from 'node:assert/strict'
import { HazardCostModel } from '../src/cost/HazardCostModel.js'
import { NavigationCostModel } from '../src/cost/NavigationCostModel.js'
import type { Neighbor } from '../src/world/NeighborGenerator.js'

const hazardNode = (hazard: string) => ({ x: 0, y: 64, z: 0, mode: 'ground' as const, metadata: { hazard } })

test('HazardCostModel differentiates hazard types and profiles', () => {
  const model = new HazardCostModel()
  assert.equal(model.directScore(hazardNode('lava')), Infinity)
  assert.ok(model.directScore(hazardNode('cactus')) > model.directScore(hazardNode('sweet_berry_bush')))
  assert.ok(model.proximityScore('lava', 1, 'safe') > model.proximityScore('lava', 1, 'normal'))
  assert.ok(model.proximityScore('lava', 1, 'normal') > model.proximityScore('lava', 1, 'fast'))
  assert.ok(model.proximityScore('lava', 1) > model.proximityScore('cactus', 1))
  assert.ok(model.proximityScore('cactus', 1) > model.proximityScore('sweet_berry_bush', 1))
})

test('NavigationCostModel actually applies HazardCostModel', () => {
  const cost = new NavigationCostModel()
  const safeNeighbor: Neighbor = { node: { x: 1, y: 64, z: 0, mode: 'ground' }, action: 'walk', baseDistance: 1, hazardScore: 0 }
  const cactusNeighbor: Neighbor = { node: hazardNode('cactus'), action: 'walk', baseDistance: 1, hazardScore: 0 }
  const lavaNeighbor: Neighbor = { node: hazardNode('lava'), action: 'walk', baseDistance: 1, hazardScore: 0 }
  assert.ok(cost.cost(cactusNeighbor) > cost.cost(safeNeighbor))
  assert.equal(cost.cost(lavaNeighbor), Infinity)
})
