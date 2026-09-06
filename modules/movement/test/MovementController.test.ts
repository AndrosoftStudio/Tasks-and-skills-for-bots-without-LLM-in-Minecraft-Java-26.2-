import test from 'node:test'
import assert from 'node:assert/strict'
import type { Bot } from 'mineflayer'
import { MovementController } from '../src/skills/movement/MovementController.js'

function fakeBot(): Bot {
  const controls = new Map<string, boolean>()
  return {
    setControlState(control: 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint' | 'sneak', state: boolean) { controls.set(control, state) },
    getControlState(control: 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint' | 'sneak') { return controls.get(control) ?? false },
    clearControlStates() { controls.clear() }
  } as unknown as Bot
}

test('stopAll clears every tracked control', () => {
  const controller = new MovementController(fakeBot())
  controller.setMany({ forward: true, sprint: true, jump: true })
  controller.stopAll()
  assert.ok(Object.values(controller.snapshot()).every(value => !value))
})

test('aborted pulse never restores controls after emergency cancellation', async () => {
  const controller = new MovementController(fakeBot())
  controller.set('forward', true)
  const abort = new AbortController()
  const running = controller.pulse({ jump: true }, 200, abort.signal)
  setTimeout(() => abort.abort(new Error('cancel')), 10)
  await assert.rejects(running)
  assert.ok(Object.values(controller.snapshot()).every(value => !value))
})
