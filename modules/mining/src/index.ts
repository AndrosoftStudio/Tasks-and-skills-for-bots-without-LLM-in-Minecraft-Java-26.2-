export * from './types.js'
export * from './ToolSelector.js'
export * from './MiningService.js'
export * from './MineflayerMiningWorld.js'
import { MiningService } from './MiningService.js'
import type { CollectDropParams, FindBlockParams, MineBlockParams, MineNearestParams, MineVeinParams, MiningNavigation, MiningResult, MiningRunOptions, MiningWorld, MiningBlock, MinedBlockData, MineVeinData } from './types.js'
export interface MiningAPI {
  findBlocks(params:FindBlockParams,options?:MiningRunOptions):Promise<MiningResult<MiningBlock[]>>
  mineBlock(params:MineBlockParams,options?:MiningRunOptions):Promise<MiningResult<MinedBlockData>>
  mineNearest(params:MineNearestParams,options?:MiningRunOptions):Promise<MiningResult<MinedBlockData>>
  collectDrop(params?:CollectDropParams,options?:MiningRunOptions):Promise<MiningResult<{entityId:number|null}>>
  mineVein(params:MineVeinParams,options?:MiningRunOptions):Promise<MiningResult<MineVeinData>>
}
export function createMining(options:{world:MiningWorld;navigation:MiningNavigation}):MiningAPI{
  const service=new MiningService(options.world,options.navigation)
  return{findBlocks:(p,o)=>service.findBlocks(p,o),mineBlock:(p,o)=>service.mineBlock(p,o),mineNearest:(p,o)=>service.mineNearest(p,o),collectDrop:(p={},o)=>service.collectDrop(p,o),mineVein:(p,o)=>service.mineVein(p,o)}
}
