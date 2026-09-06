import mineflayer from 'mineflayer'
import { createMovementSkills } from '../src/index.js'

const bot = mineflayer.createBot({
  host: process.env.MC_HOST ?? 'localhost',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.MC_USERNAME ?? 'MovementBotV2',
  version: process.env.MC_VERSION ?? '26.2'
})

bot.once('spawn', async () => {
  const movement = createMovementSkills(bot)

  movement.events.on('movement:avoidance', event => console.log('[avoidance]', event))
  movement.events.on('movement:recovery-plan', event => console.log('[recovery]', event))
  movement.events.on('movement:target-lost', event => console.log('[target-lost]', event))
  movement.events.on('movement:target-reacquired', event => console.log('[target-reacquired]', event))

  const start = bot.entity.position.clone()
  const result = await movement.moveTo({
    x: start.x + 5,
    y: start.y,
    z: start.z,
    tolerance: 0.75,
    maxSafeDrop: 3,
    localAvoidance: true,
    timeout: 20_000,
    maxAttempts: 4
  })

  console.log('moveTo:', result)

  // await movement.followPlayer({ username: 'Steve', distance: 3, reacquireTimeoutMs: 8000, stableForMs: 0 })
  // await movement.stepUp()
  // await movement.safeDrop({ maxDepth: 3 })
  // await movement.climb({ targetY: start.y + 5 })
  // await movement.swim({ x: start.x + 5, y: start.y + 1, z: start.z })
})

bot.on('kicked', console.log)
bot.on('error', console.error)
