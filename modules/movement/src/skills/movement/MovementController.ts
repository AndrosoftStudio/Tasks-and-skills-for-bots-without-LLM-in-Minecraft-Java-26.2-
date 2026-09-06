import type { Bot } from 'mineflayer'
import type { MovementControl } from './types.js'
import { sleep, throwIfAborted } from '../../utils/async.js'

const CONTROLS: MovementControl[] = ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak']

export class MovementController {
  private readonly active = new Set<MovementControl>()

  constructor(private readonly bot: Bot) {}

  set(control: MovementControl, enabled: boolean): void {
    this.bot.setControlState(control, enabled)
    if (enabled) this.active.add(control)
    else this.active.delete(control)
  }

  setMany(states: Partial<Record<MovementControl, boolean>>): void {
    for (const [control, enabled] of Object.entries(states) as Array<[MovementControl, boolean | undefined]>) {
      if (enabled !== undefined) this.set(control, enabled)
    }
  }

  isActive(control: MovementControl): boolean {
    return this.active.has(control) || this.bot.getControlState(control)
  }

  snapshot(): Readonly<Record<MovementControl, boolean>> {
    return Object.fromEntries(CONTROLS.map(control => [control, this.isActive(control)])) as Record<MovementControl, boolean>
  }

  stopAll(): void {
    this.bot.clearControlStates()
    this.active.clear()
  }

  stopHorizontal(): void {
    this.setMany({ forward: false, back: false, left: false, right: false, sprint: false })
  }

  setVertical(direction: 'up' | 'down' | 'neutral', mode: 'water' | 'climb'): void {
    if (mode === 'water') {
      this.setMany({ jump: direction === 'up', sneak: direction === 'down', sprint: false })
      return
    }
    this.setMany({
      forward: direction === 'up',
      jump: direction === 'up',
      sneak: direction === 'neutral',
      sprint: false
    })
  }

  async pulse(
    states: Partial<Record<MovementControl, boolean>>,
    durationMs: number,
    signal?: AbortSignal
  ): Promise<void> {
    throwIfAborted(signal)
    const previous = this.snapshot()
    try {
      this.setMany(states)
      await sleep(durationMs, signal)
    } finally {
      if (signal?.aborted) {
        this.stopAll()
      } else {
        for (const control of CONTROLS) this.set(control, previous[control])
      }
    }
  }
}
