import mineflayer from 'mineflayer'
import { createMiningForNavigationV11, MineflayerMiningWorld, type NavigationV11Like } from '../src/index.js'

const bot=mineflayer.createBot({host:'localhost',username:'MinerBot'})

bot.once('spawn',async()=>{
  const navigation=(globalThis as unknown as {navigation?:NavigationV11Like}).navigation
  if(!navigation)throw new Error('attach the Navigation V1.1 API as globalThis.navigation for this example')
  const mining=createMiningForNavigationV11({world:new MineflayerMiningWorld(bot),navigation})
  const result=await mining.mineNearest({names:['iron_ore','deepslate_iron_ore'],maxDistance:48,profile:'NORMAL',collectDrops:true})
  console.log(result)
})
