import mineflayer, { type Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import { createNavigation, type MovementFacade } from '../src/index.js'

const bot = mineflayer.createBot({ host: 'localhost', username: 'NavBot' })

bot.once('spawn', async () => {
  // O exemplo usa carregamento dinâmico porque Movement vive como módulo irmão no monorepo.
  const movementModule = await import(new URL('../../movement/src/index.js', import.meta.url).href) as unknown as {
    createMovementSkills(bot: Bot): MovementFacade
  }
  const movement = movementModule.createMovementSkills(bot)
  const navigation = createNavigation({ bot, movement, home: bot.entity.position.clone() })

  const result = await navigation.goToPosition({
    x: bot.entity.position.x + 20,
    y: bot.entity.position.y,
    z: bot.entity.position.z,
    maxDistance: 64,
    replan: true,
    avoidHazards: true
  })

  console.log(result)
  const home = await navigation.returnHome({ maxDistance: 64 })
  console.log(home)
})
