export * from './types.js'
export * from './ToolSelector.js'
export * from './MiningService.js'
export * from './MineflayerMiningWorld.js'
export * from './NavigationV11Adapter.js'
export * from './skills.js'
import { MiningService } from './MiningService.js'
import { adaptNavigationV11, type NavigationV11Like } from './NavigationV11Adapter.js'
import { CollectDropSkill, FindBlockSkill, MineBlockSkill, MineNearestSkill, MineVeinSkill } from './skills.js'
import type { CollectDropParams, FindBlockParams, FindOneBlockParams, MineBlockParams, MineNearestParams, MineVeinParams, MiningNavigation, MiningResult, MiningRunOptions, MiningWorld, MiningBlock, MinedBlockData, MineVeinData } from './types.js'
export interface MiningAPI {
  findBlock(params:FindOneBlockParams,options?:MiningRunOptions):Promise<MiningResult<MiningBlock>>
  findBlocks(params:FindBlockParams,options?:MiningRunOptions):Promise<MiningResult<MiningBlock[]>>
  mineBlock(params:MineBlockParams,options?:MiningRunOptions):Promise<MiningResult<MinedBlockData>>
  mineNearest(params:MineNearestParams,options?:MiningRunOptions):Promise<MiningResult<MinedBlockData>>
  collectDrop(params?:CollectDropParams,options?:MiningRunOptions):Promise<MiningResult<{entityId:number|null}>>
  mineVein(params:MineVeinParams,options?:MiningRunOptions):Promise<MiningResult<MineVeinData>>
}
export function createMining(options:{world:MiningWorld;navigation:MiningNavigation}):MiningAPI{
  const service=new MiningService(options.world,options.navigation)
  const skills={findBlock:new FindBlockSkill(service),mineBlock:new MineBlockSkill(service),mineNearest:new MineNearestSkill(service),collectDrop:new CollectDropSkill(service),mineVein:new MineVeinSkill(service)}
  const run=<P,T>(skill:{defaultTimeoutMs:number;execute(p:P,o?:MiningRunOptions):Promise<MiningResult<T>>},p:P,o:MiningRunOptions={})=>skill.execute(p,{...o,timeoutMs:o.timeoutMs??skill.defaultTimeoutMs})
  return{findBlock:(p,o)=>run(skills.findBlock,p,o),findBlocks:(p,o)=>service.findBlocks(p,o),mineBlock:(p,o)=>run(skills.mineBlock,p,o),mineNearest:(p,o)=>run(skills.mineNearest,p,o),collectDrop:(p={},o)=>run(skills.collectDrop,p,o),mineVein:(p,o)=>run(skills.mineVein,p,o)}
}
export function createMiningForNavigationV11(options:{world:MiningWorld;navigation:NavigationV11Like}):MiningAPI{return createMining({world:options.world,navigation:adaptNavigationV11(options.navigation)})}
